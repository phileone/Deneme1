package com.example.tetris.engine

data class Tetromino(
    val type: TetrominoType,
    val x: Int,
    val y: Int,
    val rotation: Int = 0
) {
    fun currentShape(): Array<IntArray> = type.shape(rotation)

    fun rotated(): Tetromino = copy(rotation = (rotation + 1) and 3)

    fun moved(dx: Int, dy: Int): Tetromino = copy(x = x + dx, y = y + dy)

    fun cells(): List<Pair<Int, Int>> {
        val result = mutableListOf<Pair<Int, Int>>()
        val shape = currentShape()
        for (row in 0..3) {
            for (col in 0..3) {
                if (shape[row][col] != 0) {
                    result.add(Pair(x + col, y + row))
                }
            }
        }
        return result
    }
}
