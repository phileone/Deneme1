package com.example.tetris.ui

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import com.example.tetris.engine.Board
import com.example.tetris.engine.GameEngine
import com.example.tetris.engine.GameState
import com.example.tetris.engine.Tetromino

class BoardRenderer {

    private var cellSize = 0f
    private var boardLeft = 0f
    private var boardTop = 0f
    private var hudHeight = 0f
    private var previewLeft = 0f
    private var previewTop = 0f
    private var surfaceWidth = 0
    private var surfaceHeight = 0

    private val bgPaint = Paint().apply { color = Color.parseColor("#0D0D1A") }
    private val gridPaint = Paint().apply {
        color = Color.parseColor("#2A2A4A")
        strokeWidth = 1f
        style = Paint.Style.STROKE
    }
    private val cellPaint = Paint().apply { isAntiAlias = true }
    private val ghostPaint = Paint().apply {
        color = Color.argb(50, 255, 255, 255)
        style = Paint.Style.FILL
        isAntiAlias = true
    }
    private val textPaint = Paint().apply {
        color = Color.WHITE
        isAntiAlias = true
        textAlign = Paint.Align.CENTER
    }
    private val labelPaint = Paint().apply {
        color = Color.parseColor("#AAAAAA")
        isAntiAlias = true
        textAlign = Paint.Align.CENTER
    }
    private val overlayPaint = Paint().apply {
        color = Color.argb(180, 10, 10, 30)
    }
    private val gameOverTextPaint = Paint().apply {
        color = Color.parseColor("#E94560")
        isAntiAlias = true
        textAlign = Paint.Align.CENTER
        textStyle = Paint.Style.FILL
        isFakeBoldText = true
    }
    private val hudBgPaint = Paint().apply {
        color = Color.argb(80, 255, 255, 255)
        style = Paint.Style.FILL
    }
    private val cellRect = RectF()
    private val highlightPaint = Paint().apply {
        color = Color.argb(80, 255, 255, 255)
        isAntiAlias = true
    }

    fun onSizeChanged(w: Int, h: Int) {
        surfaceWidth = w
        surfaceHeight = h

        // Reserve 12% for HUD at top, 5% padding at bottom
        hudHeight = h * 0.10f
        val availableH = h - hudHeight - h * 0.05f
        val availableW = w * 0.72f // leave right panel for next piece

        cellSize = minOf(availableH / Board.ROWS, availableW / Board.COLS)

        val boardW = cellSize * Board.COLS
        val boardH = cellSize * Board.ROWS
        boardLeft = (w * 0.72f - boardW) / 2f
        boardTop = hudHeight + (availableH - boardH) / 2f

        // Next piece panel: right side
        previewLeft = boardLeft + boardW + 16f
        previewTop = boardTop + 60f

        textPaint.textSize = cellSize * 0.8f
        labelPaint.textSize = cellSize * 0.55f
        gameOverTextPaint.textSize = cellSize * 2f
    }

    fun draw(canvas: Canvas, engine: GameEngine) {
        canvas.drawColor(Color.parseColor("#1A1A2E"))
        drawHUD(canvas, engine)
        drawBoard(canvas, engine)
        drawGhostPiece(canvas, engine)
        drawCurrentPiece(canvas, engine.currentPiece)
        drawNextPanel(canvas, engine)
        if (engine.state == GameState.GameOver) {
            drawGameOverOverlay(canvas)
        }
    }

    private fun drawHUD(canvas: Canvas, engine: GameEngine) {
        val cx = boardLeft + (cellSize * Board.COLS) / 2f
        // Score
        labelPaint.textAlign = Paint.Align.CENTER
        textPaint.textAlign = Paint.Align.CENTER
        labelPaint.textSize = hudHeight * 0.28f
        textPaint.textSize = hudHeight * 0.48f
        canvas.drawText("SCORE", cx, hudHeight * 0.38f, labelPaint)
        canvas.drawText(engine.score.toString(), cx, hudHeight * 0.85f, textPaint)
    }

    private fun drawBoard(canvas: Canvas, engine: GameEngine) {
        // Board background
        canvas.drawRect(
            boardLeft, boardTop,
            boardLeft + cellSize * Board.COLS,
            boardTop + cellSize * Board.ROWS,
            bgPaint
        )

        // Locked cells
        for (row in 0 until Board.ROWS) {
            for (col in 0 until Board.COLS) {
                val color = engine.board.getCell(row, col)
                if (color != 0) drawCell(canvas, col, row, color, alpha = 255)
            }
        }

        // Grid lines
        for (col in 0..Board.COLS) {
            val x = boardLeft + col * cellSize
            canvas.drawLine(x, boardTop, x, boardTop + cellSize * Board.ROWS, gridPaint)
        }
        for (row in 0..Board.ROWS) {
            val y = boardTop + row * cellSize
            canvas.drawLine(boardLeft, y, boardLeft + cellSize * Board.COLS, y, gridPaint)
        }
    }

    private fun drawGhostPiece(canvas: Canvas, engine: GameEngine) {
        val ghost = engine.getGhostPiece()
        for ((cx, cy) in ghost.cells()) {
            if (cy >= 0) {
                val px = boardLeft + cx * cellSize
                val py = boardTop + cy * cellSize
                val pad = cellSize * 0.04f
                cellRect.set(px + pad, py + pad, px + cellSize - pad, py + cellSize - pad)
                canvas.drawRoundRect(cellRect, 4f, 4f, ghostPaint)
            }
        }
    }

    private fun drawCurrentPiece(canvas: Canvas, piece: Tetromino) {
        for ((cx, cy) in piece.cells()) {
            if (cy >= 0) drawCell(canvas, cx, cy, piece.type.color, alpha = 255)
        }
    }

    private fun drawNextPanel(canvas: Canvas, engine: GameEngine) {
        val panelRight = surfaceWidth.toFloat() - 12f
        val panelW = panelRight - previewLeft
        val labelSize = cellSize * 0.5f
        labelPaint.textAlign = Paint.Align.CENTER
        labelPaint.textSize = labelSize
        canvas.drawText("NEXT", previewLeft + panelW / 2f, previewTop - labelSize * 0.3f, labelPaint)

        // Level
        val levelY = previewTop + cellSize * 5.5f
        labelPaint.textSize = labelSize
        textPaint.textSize = labelSize * 1.4f
        labelPaint.textAlign = Paint.Align.CENTER
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("LEVEL", previewLeft + panelW / 2f, levelY, labelPaint)
        canvas.drawText(engine.level.toString(), previewLeft + panelW / 2f, levelY + cellSize * 1.1f, textPaint)

        // Lines
        val linesY = levelY + cellSize * 2.8f
        canvas.drawText("LINES", previewLeft + panelW / 2f, linesY, labelPaint)
        canvas.drawText(engine.linesCleared.toString(), previewLeft + panelW / 2f, linesY + cellSize * 1.1f, textPaint)

        // Draw next piece centered in a 4x2 area
        val nextPiece = engine.nextPiece
        val shape = nextPiece.currentShape()
        val previewCellSize = cellSize * 0.9f
        val areaW = previewCellSize * 4
        val offsetX = previewLeft + (panelW - areaW) / 2f
        val offsetY = previewTop + labelSize * 1.2f

        for (row in 0..3) {
            for (col in 0..3) {
                if (shape[row][col] != 0) {
                    val px = offsetX + col * previewCellSize
                    val py = offsetY + row * previewCellSize
                    val pad = previewCellSize * 0.06f
                    cellPaint.color = nextPiece.type.color
                    cellPaint.alpha = 255
                    cellRect.set(px + pad, py + pad, px + previewCellSize - pad, py + previewCellSize - pad)
                    canvas.drawRoundRect(cellRect, 5f, 5f, cellPaint)
                    // Highlight
                    val hRect = RectF(px + pad, py + pad, px + previewCellSize - pad, py + pad + previewCellSize * 0.25f)
                    canvas.drawRoundRect(hRect, 5f, 5f, highlightPaint)
                }
            }
        }
    }

    private fun drawGameOverOverlay(canvas: Canvas) {
        canvas.drawRect(0f, 0f, surfaceWidth.toFloat(), surfaceHeight.toFloat(), overlayPaint)
        val cx = surfaceWidth / 2f
        val cy = surfaceHeight / 2f
        gameOverTextPaint.textSize = cellSize * 1.8f
        canvas.drawText("GAME", cx, cy - cellSize * 1.2f, gameOverTextPaint)
        canvas.drawText("OVER", cx, cy + cellSize * 0.2f, gameOverTextPaint)
    }

    private fun drawCell(canvas: Canvas, col: Int, row: Int, color: Int, alpha: Int) {
        val px = boardLeft + col * cellSize
        val py = boardTop + row * cellSize
        val pad = cellSize * 0.04f
        cellPaint.color = color
        cellPaint.alpha = alpha
        cellRect.set(px + pad, py + pad, px + cellSize - pad, py + cellSize - pad)
        canvas.drawRoundRect(cellRect, 4f, 4f, cellPaint)
        // Bevel highlight (top-left corner shine)
        val hRect = RectF(px + pad, py + pad, px + cellSize - pad, py + pad + cellSize * 0.22f)
        canvas.drawRoundRect(hRect, 4f, 4f, highlightPaint)
    }
}
