package com.example.pdforganizer.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.widget.SearchView
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.pdforganizer.R
import com.example.pdforganizer.adapter.PdfAdapter
import com.example.pdforganizer.databinding.FragmentAllPdfsBinding
import com.example.pdforganizer.manager.PdfManager
import com.example.pdforganizer.model.PdfFile
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import java.io.File

class AllPdfsFragment : Fragment() {

    private var _binding: FragmentAllPdfsBinding? = null
    private val binding get() = _binding!!

    private lateinit var pdfManager: PdfManager
    private lateinit var adapter: PdfAdapter
    private var allPdfs = listOf<PdfFile>()
    private var currentSort = PdfManager.SortBy.DATE
    private var sortAscending = false

    companion object {
        private const val PERMISSION_REQUEST = 100
        private const val MANAGE_STORAGE_REQUEST = 101
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAllPdfsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        pdfManager = PdfManager(requireContext())
        setupRecyclerView()
        setupSearch()
        binding.btnSort.setOnClickListener { showSortDialog() }
        checkPermissionAndLoad()
    }

    override fun onResume() {
        super.onResume()
        if (::pdfManager.isInitialized) {
            loadPdfs()
        }
    }

    private fun setupRecyclerView() {
        adapter = PdfAdapter(
            onPdfClick = { pdf -> openPdf(pdf) },
            onAssignFolder = { pdf -> showFolderPickerDialog(pdf) }
        )
        binding.recyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerView.adapter = adapter
    }

    private fun setupSearch() {
        binding.searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?) = false
            override fun onQueryTextChange(newText: String?): Boolean {
                filterAndDisplay(newText ?: "")
                return true
            }
        })
    }

    private fun showSortDialog() {
        val options = arrayOf(
            "İsme Göre (A-Z)", "İsme Göre (Z-A)",
            "Tarihe Göre (Yeni)", "Tarihe Göre (Eski)",
            "Boyuta Göre (Büyük)", "Boyuta Göre (Küçük)"
        )
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Sırala")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> { currentSort = PdfManager.SortBy.NAME; sortAscending = true }
                    1 -> { currentSort = PdfManager.SortBy.NAME; sortAscending = false }
                    2 -> { currentSort = PdfManager.SortBy.DATE; sortAscending = false }
                    3 -> { currentSort = PdfManager.SortBy.DATE; sortAscending = true }
                    4 -> { currentSort = PdfManager.SortBy.SIZE; sortAscending = false }
                    5 -> { currentSort = PdfManager.SortBy.SIZE; sortAscending = true }
                }
                filterAndDisplay(binding.searchView.query?.toString() ?: "")
            }.show()
    }

    private fun filterAndDisplay(query: String) {
        val filtered = if (query.isEmpty()) allPdfs
        else allPdfs.filter { it.name.contains(query, ignoreCase = true) }
        val sorted = pdfManager.sortPdfs(filtered, currentSort, sortAscending)
        adapter.submitList(sorted)
        binding.tvEmpty.visibility = if (sorted.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun checkPermissionAndLoad() {
        when {
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.R -> {
                if (Environment.isExternalStorageManager()) loadPdfs()
                else showManageStorageDialog()
            }
            else -> {
                if (ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED) {
                    loadPdfs()
                } else {
                    requestPermissions(arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE), PERMISSION_REQUEST)
                }
            }
        }
    }

    private fun showManageStorageDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Depolama İzni Gerekli")
            .setMessage("PDF dosyalarını taramak için \"Tüm dosyalara erişim\" iznine ihtiyaç vardır.")
            .setPositiveButton("İzin Ver") { _, _ ->
                val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
                    Uri.parse("package:${requireContext().packageName}"))
                @Suppress("DEPRECATION")
                startActivityForResult(intent, MANAGE_STORAGE_REQUEST)
            }
            .setNegativeButton("İptal", null)
            .show()
    }

    fun loadPdfs() {
        binding.progressBar.visibility = View.VISIBLE
        Thread {
            val pdfs = pdfManager.getAllPdfs()
            requireActivity().runOnUiThread {
                allPdfs = pdfs
                binding.progressBar.visibility = View.GONE
                binding.tvPdfCount.text = "${pdfs.size} PDF bulundu"
                filterAndDisplay(binding.searchView.query?.toString() ?: "")
            }
        }.start()
    }

    private fun openPdf(pdf: PdfFile) {
        try {
            val uri = FileProvider.getUriForFile(
                requireContext(), "${requireContext().packageName}.provider", File(pdf.path)
            )
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/pdf")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(Intent.createChooser(intent, "PDF Aç"))
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "PDF açılamadı: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showFolderPickerDialog(pdf: PdfFile) {
        val folders = pdfManager.getFolders()
        val names = mutableListOf<String>().apply {
            add("Klasörden Çıkar")
            addAll(folders.map { it.name })
        }
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Klasöre Taşı")
            .setItems(names.toTypedArray()) { _, which ->
                if (which == 0) {
                    pdfManager.assignPdfToFolder(pdf.path, null)
                    Toast.makeText(requireContext(), "Klasörden çıkarıldı", Toast.LENGTH_SHORT).show()
                } else {
                    val folder = folders[which - 1]
                    pdfManager.assignPdfToFolder(pdf.path, folder.id)
                    Toast.makeText(requireContext(), "'${folder.name}' klasörüne eklendi", Toast.LENGTH_SHORT).show()
                }
                loadPdfs()
            }.show()
    }

    @Suppress("DEPRECATION")
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        if (requestCode == PERMISSION_REQUEST && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            loadPdfs()
        } else {
            binding.tvEmpty.text = getString(R.string.permission_denied_message)
            binding.tvEmpty.visibility = View.VISIBLE
        }
    }

    @Suppress("DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == MANAGE_STORAGE_REQUEST && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && Environment.isExternalStorageManager()) {
            loadPdfs()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
