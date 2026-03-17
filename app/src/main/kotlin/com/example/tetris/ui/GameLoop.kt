package com.example.tetris.ui

import android.os.Handler
import android.os.Looper
import android.view.SurfaceHolder
import com.example.tetris.engine.GameEngine
import com.example.tetris.engine.GameState

class GameLoop(
    private val surfaceHolder: SurfaceHolder,
    private val engine: GameEngine,
    private val renderer: BoardRenderer,
    private val onGameOver: () -> Unit
) : Thread("GameLoop") {

    @Volatile var running = false

    private val targetFps = 60
    private val targetFrameMs = 1000L / targetFps
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun run() {
        var lastDropTime = System.currentTimeMillis()
        var gameOverPosted = false

        while (running) {
            val frameStart = System.currentTimeMillis()

            // Gravity tick
            if (engine.state == GameState.Running) {
                val now = System.currentTimeMillis()
                if (now - lastDropTime >= engine.dropIntervalMs) {
                    engine.tick()
                    lastDropTime = now
                }
            }

            // Notify game over once on main thread
            if (engine.state == GameState.GameOver && !gameOverPosted) {
                gameOverPosted = true
                mainHandler.postDelayed({ onGameOver() }, 600)
            }

            // Render
            val canvas = surfaceHolder.lockCanvas()
            if (canvas != null) {
                try {
                    synchronized(surfaceHolder) {
                        renderer.draw(canvas, engine)
                    }
                } finally {
                    surfaceHolder.unlockCanvasAndPost(canvas)
                }
            }

            // Cap frame rate
            val elapsed = System.currentTimeMillis() - frameStart
            val sleepTime = targetFrameMs - elapsed
            if (sleepTime > 0) {
                try { sleep(sleepTime) } catch (_: InterruptedException) { break }
            }
        }
    }
}
