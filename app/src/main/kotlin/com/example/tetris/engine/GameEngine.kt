package com.example.tetris.engine

class GameEngine {

    val board = Board()

    @Volatile var currentPiece: Tetromino = spawnPiece()
        private set
    @Volatile var nextPiece: Tetromino = spawnPiece()
        private set
    @Volatile var score: Int = 0
        private set
    @Volatile var level: Int = 1
        private set
    @Volatile var linesCleared: Int = 0
        private set
    @Volatile var state: GameState = GameState.Idle
        private set

    val dropIntervalMs: Long
        get() = maxOf(100L, 800L - (level - 1) * 70L)

    fun start() {
        synchronized(this) {
            board.reset()
            score = 0
            level = 1
            linesCleared = 0
            currentPiece = spawnPiece()
            nextPiece = spawnPiece()
            state = GameState.Running
        }
    }

    /** Called by the game loop on each gravity tick. */
    fun tick() {
        synchronized(this) {
            if (state != GameState.Running) return
            val moved = currentPiece.moved(0, 1)
            if (board.isValidPosition(moved)) {
                currentPiece = moved
            } else {
                lockAndAdvance()
            }
        }
    }

    fun moveLeft() {
        synchronized(this) {
            if (state != GameState.Running) return
            val moved = currentPiece.moved(-1, 0)
            if (board.isValidPosition(moved)) currentPiece = moved
        }
    }

    fun moveRight() {
        synchronized(this) {
            if (state != GameState.Running) return
            val moved = currentPiece.moved(1, 0)
            if (board.isValidPosition(moved)) currentPiece = moved
        }
    }

    fun rotate() {
        synchronized(this) {
            if (state != GameState.Running) return
            val rotated = currentPiece.rotated()
            if (board.isValidPosition(rotated)) currentPiece = rotated
        }
    }

    fun softDrop() {
        synchronized(this) {
            if (state != GameState.Running) return
            val moved = currentPiece.moved(0, 1)
            if (board.isValidPosition(moved)) {
                currentPiece = moved
                score += 1
            } else {
                lockAndAdvance()
            }
        }
    }

    fun hardDrop() {
        synchronized(this) {
            if (state != GameState.Running) return
            var dropped = currentPiece
            var dropCount = 0
            while (true) {
                val next = dropped.moved(0, 1)
                if (board.isValidPosition(next)) {
                    dropped = next
                    dropCount++
                } else break
            }
            currentPiece = dropped
            score += dropCount * 2
            lockAndAdvance()
        }
    }

    /** Returns ghost piece (furthest valid downward position of current piece). */
    fun getGhostPiece(): Tetromino {
        var ghost = currentPiece
        while (true) {
            val next = ghost.moved(0, 1)
            if (board.isValidPosition(next)) ghost = next else break
        }
        return ghost
    }

    private fun lockAndAdvance() {
        board.lockPiece(currentPiece)
        val lines = board.clearLines()
        if (lines > 0) {
            linesCleared += lines
            score += scoreForLines(lines)
            level = (linesCleared / 10) + 1
        }
        currentPiece = nextPiece
        nextPiece = spawnPiece()
        if (!board.isValidPosition(currentPiece)) {
            state = GameState.GameOver
        }
    }

    private fun scoreForLines(lines: Int): Int {
        return when (lines) {
            1 -> 100 * level
            2 -> 300 * level
            3 -> 500 * level
            4 -> 800 * level
            else -> 0
        }
    }

    private fun spawnPiece(): Tetromino =
        Tetromino(type = TetrominoType.random(), x = 3, y = 0)
}
