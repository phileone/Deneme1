package com.example.pdforganizer.ui

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.pdforganizer.adapter.PdfAdapter
import com.example.pdforganizer.databinding.ActivityFolderDetailBinding
import com.example.pdforganizer.manager.PdfManager
import com.example.pdforganizer.model.PdfFile
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import java.io.File

class FolderDetailActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_FOLDER_ID = "folder_id"
        const val EXTRA_FOLDER_NAME = "folder_name"
        const val EXTRA_FOLDER_COLOR = "folder_color"
    }

    private lateinit var binding: ActivityFolderDetailBinding
    private lateinit var pdfManager: PdfManager
    private lateinit var adapter: PdfAdapter
    private lateinit var folderId: String

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityFolderDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)

        folderId = intent.getStringExtra(EXTRA_FOLDER_ID) ?: return finish()
        val folderName = intent.getStringExtra(EXTRA_FOLDER_NAME) ?: "Klasör"
        val folderColor = intent.getStringExtra(EXTRA_FOLDER_COLOR) ?: "#1976D2"

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = folderName

        try {
            binding.toolbar.setBackgroundColor(Color.parseColor(folderColor))
        } catch (_: Exception) {}

        pdfManager = PdfManager(this)
        setupRecyclerView()
        loadPdfs()
    }

    override fun onSupportNavigateUp(): Boolean {
        onBackPressedDispatcher.onBackPressed()
        return true
    }

    override fun onResume() {
        super.onResume()
        loadPdfs()
    }

    private fun setupRecyclerView() {
        adapter = PdfAdapter(
            onPdfClick = { pdf -> openPdf(pdf) },
            onAssignFolder = { pdf -> showRemoveDialog(pdf) }
        )
        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = adapter
    }

    private fun loadPdfs() {
        binding.progressBar.visibility = View.VISIBLE
        Thread {
            val pdfs = pdfManager.getPdfsInFolder(folderId)
            runOnUiThread {
                binding.progressBar.visibility = View.GONE
                binding.tvPdfCount.text = "${pdfs.size} PDF"
                adapter.submitList(pdfs)
                binding.tvEmpty.visibility = if (pdfs.isEmpty()) View.VISIBLE else View.GONE
            }
        }.start()
    }

    private fun openPdf(pdf: PdfFile) {
        try {
            val uri = FileProvider.getUriForFile(this, "$packageName.provider", File(pdf.path))
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/pdf")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(Intent.createChooser(intent, "PDF Aç"))
        } catch (e: Exception) {
            Toast.makeText(this, "PDF açılamadı: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showRemoveDialog(pdf: PdfFile) {
        MaterialAlertDialogBuilder(this)
            .setTitle("Klasörden Çıkar")
            .setMessage("\"${pdf.displayName()}\" bu klasörden çıkarılsın mı?")
            .setPositiveButton("Çıkar") { _, _ ->
                pdfManager.assignPdfToFolder(pdf.path, null)
                Toast.makeText(this, "Klasörden çıkarıldı", Toast.LENGTH_SHORT).show()
                loadPdfs()
            }
            .setNegativeButton("İptal", null)
            .show()
    }
}
