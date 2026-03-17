package com.example.tetris.engine

class Board {
    companion object {
        const val COLS = 10
        const val ROWS = 20
    }

    val grid: Array<IntArray> = Array(ROWS) { IntArray(COLS) }

    fun isValidPosition(tetromino: Tetromino): Boolean {
        for ((cx, cy) in tetromino.cells()) {
            if (cx < 0 || cx >= COLS || cy >= ROWS) return false
            if (cy >= 0 && grid[cy][cx] != 0) return false
        }
        return true
    }

    fun lockPiece(tetromino: Tetromino) {
        for ((cx, cy) in tetromino.cells()) {
            if (cy >= 0 && cy < ROWS && cx >= 0 && cx < COLS) {
                grid[cy][cx] = tetromino.type.color
            }
        }
    }

    /** Returns the number of lines cleared. */
    fun clearLines(): Int {
        var cleared = 0
        var row = ROWS - 1
        while (row >= 0) {
            if (grid[row].all { it != 0 }) {
                // Shift everything above down
                for (r in row downTo 1) {
                    grid[r] = grid[r - 1].copyOf()
                }
                grid[0] = IntArray(COLS)
                cleared++
                // Don't decrement row — check the same index again (it's now new content)
            } else {
                row--
            }
        }
        return cleared
    }

    fun getCell(row: Int, col: Int): Int {
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return 0
        return grid[row][col]
    }

    fun reset() {
        for (row in grid) row.fill(0)
    }
}
