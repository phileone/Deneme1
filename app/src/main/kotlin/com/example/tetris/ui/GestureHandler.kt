package com.example.tetris.ui

import android.content.Context
import android.view.GestureDetector
import android.view.MotionEvent
import androidx.core.view.GestureDetectorCompat
import kotlin.math.abs

class GestureHandler(
    context: Context,
    private val onMoveLeft: () -> Unit,
    private val onMoveRight: () -> Unit,
    private val onSoftDrop: () -> Unit,
    private val onRotate: () -> Unit
) {
    private val swipeThreshold = 60
    private val swipeVelocityThreshold = 80

    private val detector = GestureDetectorCompat(context,
        object : GestureDetector.SimpleOnGestureListener() {

            override fun onDown(e: MotionEvent): Boolean = true

            override fun onSingleTapUp(e: MotionEvent): Boolean {
                onRotate()
                return true
            }

            override fun onFling(
                e1: MotionEvent?,
                e2: MotionEvent,
                velocityX: Float,
                velocityY: Float
            ): Boolean {
                val dx = e2.x - (e1?.x ?: 0f)
                val dy = e2.y - (e1?.y ?: 0f)
                return when {
                    abs(dx) > abs(dy) &&
                            abs(dx) > swipeThreshold &&
                            abs(velocityX) > swipeVelocityThreshold -> {
                        if (dx > 0) onMoveRight() else onMoveLeft()
                        true
                    }
                    dy > swipeThreshold &&
                            velocityY > swipeVelocityThreshold -> {
                        onSoftDrop()
                        true
                    }
                    else -> false
                }
            }
        }
    )

    fun onTouchEvent(event: MotionEvent): Boolean = detector.onTouchEvent(event)
}
