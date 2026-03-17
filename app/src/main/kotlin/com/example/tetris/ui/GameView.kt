package com.example.tetris.ui

import android.content.Context
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.SurfaceHolder
import android.view.SurfaceView
import com.example.tetris.engine.GameEngine

class GameView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : SurfaceView(context, attrs), SurfaceHolder.Callback {

    val engine = GameEngine()

    private val renderer = BoardRenderer()
    private lateinit var gameLoop: GameLoop
    private val gestureHandler = GestureHandler(
        context = context,
        onMoveLeft = engine::moveLeft,
        onMoveRight = engine::moveRight,
        onSoftDrop = engine::softDrop,
        onRotate = engine::rotate
    )

    var onGameOver: (() -> Unit)? = null

    init {
        holder.addCallback(this)
    }

    override fun surfaceCreated(holder: SurfaceHolder) {
        gameLoop = GameLoop(
            surfaceHolder = holder,
            engine = engine,
            renderer = renderer,
            onGameOver = { onGameOver?.invoke() }
        )
        engine.start()
        gameLoop.running = true
        gameLoop.start()
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
        renderer.onSizeChanged(width, height)
    }

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        gameLoop.running = false
        try { gameLoop.join(2000) } catch (_: InterruptedException) {}
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        return gestureHandler.onTouchEvent(event)
    }

    fun pauseGame() {
        gameLoop.running = false
        try { gameLoop.join(1000) } catch (_: InterruptedException) {}
    }

    fun resumeGame() {
        if (!gameLoop.isAlive) {
            gameLoop = GameLoop(
                surfaceHolder = holder,
                engine = engine,
                renderer = renderer,
                onGameOver = { onGameOver?.invoke() }
            )
            gameLoop.running = true
            gameLoop.start()
        }
    }
}
