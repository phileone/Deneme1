package com.example.pdforganizer.model

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class PdfFile(
    val name: String,
    val path: String,
    val size: Long,
    val dateModified: Long,
    var folderId: String? = null
) {
    fun formattedSize(): String = when {
        size < 1024 -> "$size B"
        size < 1024 * 1024 -> "${size / 1024} KB"
        else -> String.format("%.1f MB", size / (1024.0 * 1024.0))
    }

    fun formattedDate(): String {
        val sdf = SimpleDateFormat("dd.MM.yyyy", Locale.getDefault())
        return sdf.format(Date(dateModified))
    }

    fun displayName(): String = if (name.endsWith(".pdf", ignoreCase = true)) {
        name.dropLast(4)
    } else {
        name
    }
}
