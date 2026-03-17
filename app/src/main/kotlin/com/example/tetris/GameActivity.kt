package com.example.tetris

import android.content.Intent
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import com.example.tetris.databinding.ActivityGameBinding

class GameActivity : AppCompatActivity() {

    private lateinit var binding: ActivityGameBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        makeFullscreen()
        binding = ActivityGameBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.gameView.onGameOver = {
            val score = binding.gameView.engine.score
            val intent = Intent(this, GameOverActivity::class.java).apply {
                putExtra(GameOverActivity.EXTRA_SCORE, score)
            }
            startActivity(intent)
            finish()
        }
    }

    override fun onResume() {
        super.onResume()
        makeFullscreen()
        binding.gameView.resumeGame()
    }

    override fun onPause() {
        super.onPause()
        binding.gameView.pauseGame()
    }

    private fun makeFullscreen() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        )
    }
}
