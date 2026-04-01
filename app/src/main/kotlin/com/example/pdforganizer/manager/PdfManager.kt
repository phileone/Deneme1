package com.example.pdforganizer.manager

import android.content.Context
import android.net.Uri
import android.provider.MediaStore
import com.example.pdforganizer.model.PdfFile
import com.example.pdforganizer.model.PdfFolder
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import java.util.UUID

class PdfManager(private val context: Context) {

    private val prefs = context.getSharedPreferences("pdf_organizer", Context.MODE_PRIVATE)
    private val gson = Gson()

    // ---- PDF Scanning ----

    fun getAllPdfs(): List<PdfFile> {
        val pdfs = mutableListOf<PdfFile>()
        val assignments = getPdfAssignments()
        val uri: Uri = MediaStore.Files.getContentUri("external")
        val projection = arrayOf(
            MediaStore.Files.FileColumns.DISPLAY_NAME,
            MediaStore.Files.FileColumns.DATA,
            MediaStore.Files.FileColumns.SIZE,
            MediaStore.Files.FileColumns.DATE_MODIFIED
        )
        val selection = "${MediaStore.Files.FileColumns.MIME_TYPE} = ?"
        val selectionArgs = arrayOf("application/pdf")
        val sortOrder = "${MediaStore.Files.FileColumns.DATE_MODIFIED} DESC"

        try {
            context.contentResolver.query(uri, projection, selection, selectionArgs, sortOrder)?.use { cursor ->
                val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DISPLAY_NAME)
                val pathCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DATA)
                val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.SIZE)
                val dateCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DATE_MODIFIED)
                while (cursor.moveToNext()) {
                    val name = cursor.getString(nameCol) ?: continue
                    val path = cursor.getString(pathCol) ?: continue
                    val size = cursor.getLong(sizeCol)
                    val date = cursor.getLong(dateCol) * 1000L
                    pdfs.add(PdfFile(name, path, size, date, assignments[path]))
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return pdfs
    }

    // ---- Folder Management ----

    fun getFolders(): List<PdfFolder> {
        val json = prefs.getString("folders", "[]") ?: "[]"
        return gson.fromJson(json, object : TypeToken<List<PdfFolder>>() {}.type)
    }

    fun createFolder(name: String, color: String): PdfFolder {
        val folder = PdfFolder(id = UUID.randomUUID().toString(), name = name, color = color)
        val folders = getFolders().toMutableList().also { it.add(folder) }
        prefs.edit().putString("folders", gson.toJson(folders)).apply()
        return folder
    }

    fun updateFolder(folder: PdfFolder) {
        val folders = getFolders().toMutableList()
        val idx = folders.indexOfFirst { it.id == folder.id }
        if (idx >= 0) {
            folders[idx] = folder
            prefs.edit().putString("folders", gson.toJson(folders)).apply()
        }
    }

    fun deleteFolder(folderId: String) {
        val folders = getFolders().toMutableList().also { list -> list.removeAll { it.id == folderId } }
        prefs.edit().putString("folders", gson.toJson(folders)).apply()
        val assignments = getPdfAssignments().toMutableMap().also { map -> map.entries.removeAll { it.value == folderId } }
        saveAssignments(assignments)
    }

    // ---- Assignment Management ----

    fun assignPdfToFolder(pdfPath: String, folderId: String?) {
        val assignments = getPdfAssignments().toMutableMap()
        if (folderId == null) assignments.remove(pdfPath) else assignments[pdfPath] = folderId
        saveAssignments(assignments)
    }

    fun getPdfsInFolder(folderId: String): List<PdfFile> {
        val assignments = getPdfAssignments()
        return getAllPdfs().filter { assignments[it.path] == folderId }
    }

    fun getPdfCountInFolder(folderId: String): Int {
        return getPdfAssignments().values.count { it == folderId }
    }

    private fun getPdfAssignments(): Map<String, String> {
        val json = prefs.getString("assignments", "{}") ?: "{}"
        return gson.fromJson(json, object : TypeToken<Map<String, String>>() {}.type)
    }

    private fun saveAssignments(assignments: Map<String, String>) {
        prefs.edit().putString("assignments", gson.toJson(assignments)).apply()
    }

    // ---- Sorting ----

    enum class SortBy { NAME, DATE, SIZE }

    fun sortPdfs(pdfs: List<PdfFile>, sortBy: SortBy, ascending: Boolean): List<PdfFile> = when (sortBy) {
        SortBy.NAME -> if (ascending) pdfs.sortedBy { it.name.lowercase() } else pdfs.sortedByDescending { it.name.lowercase() }
        SortBy.DATE -> if (ascending) pdfs.sortedBy { it.dateModified } else pdfs.sortedByDescending { it.dateModified }
        SortBy.SIZE -> if (ascending) pdfs.sortedBy { it.size } else pdfs.sortedByDescending { it.size }
    }
}
