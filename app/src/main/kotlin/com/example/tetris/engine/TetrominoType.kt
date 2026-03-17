package com.example.tetris.engine

import android.graphics.Color

enum class TetrominoType(val color: Int, private val rotations: Array<Array<IntArray>>) {

    I(
        color = Color.parseColor("#00FFFF"),
        rotations = arrayOf(
            arrayOf(intArrayOf(0,0,0,0), intArrayOf(1,1,1,1), intArrayOf(0,0,0,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,0,1,0), intArrayOf(0,0,1,0), intArrayOf(0,0,1,0), intArrayOf(0,0,1,0)),
            arrayOf(intArrayOf(0,0,0,0), intArrayOf(0,0,0,0), intArrayOf(1,1,1,1), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,1,0,0), intArrayOf(0,1,0,0), intArrayOf(0,1,0,0), intArrayOf(0,1,0,0))
        )
    ),
    O(
        color = Color.parseColor("#FFFF00"),
        rotations = arrayOf(
            arrayOf(intArrayOf(0,1,1,0), intArrayOf(0,1,1,0), intArrayOf(0,0,0,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,1,1,0), intArrayOf(0,1,1,0), intArrayOf(0,0,0,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,1,1,0), intArrayOf(0,1,1,0), intArrayOf(0,0,0,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,1,1,0), intArrayOf(0,1,1,0), intArrayOf(0,0,0,0), intArrayOf(0,0,0,0))
        )
    ),
    T(
        color = Color.parseColor("#AA00FF"),
        rotations = arrayOf(
            arrayOf(intArrayOf(0,1,0,0), intArrayOf(1,1,1,0), intArrayOf(0,0,0,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,1,0,0), intArrayOf(0,1,1,0), intArrayOf(0,1,0,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,0,0,0), intArrayOf(1,1,1,0), intArrayOf(0,1,0,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,1,0,0), intArrayOf(1,1,0,0), intArrayOf(0,1,0,0), intArrayOf(0,0,0,0))
        )
    ),
    S(
        color = Color.parseColor("#00FF00"),
        rotations = arrayOf(
            arrayOf(intArrayOf(0,1,1,0), intArrayOf(1,1,0,0), intArrayOf(0,0,0,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,1,0,0), intArrayOf(0,1,1,0), intArrayOf(0,0,1,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,0,0,0), intArrayOf(0,1,1,0), intArrayOf(1,1,0,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(1,0,0,0), intArrayOf(1,1,0,0), intArrayOf(0,1,0,0), intArrayOf(0,0,0,0))
        )
    ),
    Z(
        color = Color.parseColor("#FF4444"),
        rotations = arrayOf(
            arrayOf(intArrayOf(1,1,0,0), intArrayOf(0,1,1,0), intArrayOf(0,0,0,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,0,1,0), intArrayOf(0,1,1,0), intArrayOf(0,1,0,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,0,0,0), intArrayOf(1,1,0,0), intArrayOf(0,1,1,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,1,0,0), intArrayOf(1,1,0,0), intArrayOf(1,0,0,0), intArrayOf(0,0,0,0))
        )
    ),
    J(
        color = Color.parseColor("#4488FF"),
        rotations = arrayOf(
            arrayOf(intArrayOf(1,0,0,0), intArrayOf(1,1,1,0), intArrayOf(0,0,0,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,1,1,0), intArrayOf(0,1,0,0), intArrayOf(0,1,0,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,0,0,0), intArrayOf(1,1,1,0), intArrayOf(0,0,1,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,1,0,0), intArrayOf(0,1,0,0), intArrayOf(1,1,0,0), intArrayOf(0,0,0,0))
        )
    ),
    L(
        color = Color.parseColor("#FF7F00"),
        rotations = arrayOf(
            arrayOf(intArrayOf(0,0,1,0), intArrayOf(1,1,1,0), intArrayOf(0,0,0,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,1,0,0), intArrayOf(0,1,0,0), intArrayOf(0,1,1,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(0,0,0,0), intArrayOf(1,1,1,0), intArrayOf(1,0,0,0), intArrayOf(0,0,0,0)),
            arrayOf(intArrayOf(1,1,0,0), intArrayOf(0,1,0,0), intArrayOf(0,1,0,0), intArrayOf(0,0,0,0))
        )
    );

    fun shape(rotation: Int): Array<IntArray> = rotations[rotation and 3]

    companion object {
        private val values = entries.toTypedArray()
        fun random(): TetrominoType = values[(Math.random() * values.size).toInt()]
    }
}
