package com.example.pdforganizer.model

data class PdfFolder(
    val id: String,
    var name: String,
    var color: String = "#1976D2",
    val createdAt: Long = System.currentTimeMillis()
)
