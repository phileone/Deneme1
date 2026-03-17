package com.example.tetris.engine

sealed class GameState {
    object Idle : GameState()
    object Running : GameState()
    object Paused : GameState()
    object GameOver : GameState()
}
