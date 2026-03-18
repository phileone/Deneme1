package com.example.pdforganizer.ui

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.Toast
import androidx.core.graphics.drawable.DrawableCompat
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.pdforganizer.R
import com.example.pdforganizer.adapter.FolderAdapter
import com.example.pdforganizer.databinding.FragmentFoldersBinding
import com.example.pdforganizer.manager.PdfManager
import com.example.pdforganizer.model.PdfFolder
import com.google.android.material.dialog.MaterialAlertDialogBuilder

class FoldersFragment : Fragment() {

    private var _binding: FragmentFoldersBinding? = null
    private val binding get() = _binding!!
    private lateinit var pdfManager: PdfManager
    private lateinit var adapter: FolderAdapter

    private val folderColors = listOf(
        "#1976D2", "#D32F2F", "#388E3C", "#F57C00", "#7B1FA2", "#00796B"
    )
    private var selectedColor = folderColors[0]

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentFoldersBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        pdfManager = PdfManager(requireContext())
        setupRecyclerView()
        binding.fabNewFolder.setOnClickListener { showCreateFolderDialog() }
        loadFolders()
    }

    override fun onResume() {
        super.onResume()
        if (::pdfManager.isInitialized) loadFolders()
    }

    private fun setupRecyclerView() {
        adapter = FolderAdapter(
            onFolderClick = { folder ->
                val intent = Intent(requireContext(), FolderDetailActivity::class.java).apply {
                    putExtra(FolderDetailActivity.EXTRA_FOLDER_ID, folder.id)
                    putExtra(FolderDetailActivity.EXTRA_FOLDER_NAME, folder.name)
                    putExtra(FolderDetailActivity.EXTRA_FOLDER_COLOR, folder.color)
                }
                startActivity(intent)
            },
            onFolderEdit = { folder -> showEditFolderDialog(folder) },
            onFolderDelete = { folder -> showDeleteConfirmDialog(folder) }
        )
        binding.recyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerView.adapter = adapter
    }

    private fun loadFolders() {
        val folders = pdfManager.getFolders()
        val enriched = folders.map { folder ->
            folder.copy().also { /* pdfCount stored in adapter */ }
        }
        adapter.submitList(folders, pdfManager)
        binding.tvEmpty.visibility = if (folders.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun showCreateFolderDialog() {
        selectedColor = folderColors[0]
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_create_folder, null)
        val etName = dialogView.findViewById<EditText>(R.id.etFolderName)
        val colorContainer = dialogView.findViewById<LinearLayout>(R.id.colorPicker)
        setupColorPicker(colorContainer, null)

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Yeni Klasör")
            .setView(dialogView)
            .setPositiveButton("Oluştur") { _, _ ->
                val name = etName.text.toString().trim()
                if (name.isEmpty()) {
                    Toast.makeText(requireContext(), "Klasör adı boş olamaz", Toast.LENGTH_SHORT).show()
                } else {
                    pdfManager.createFolder(name, selectedColor)
                    loadFolders()
                }
            }
            .setNegativeButton("İptal", null)
            .show()
    }

    private fun showEditFolderDialog(folder: PdfFolder) {
        selectedColor = folder.color
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_create_folder, null)
        val etName = dialogView.findViewById<EditText>(R.id.etFolderName)
        val colorContainer = dialogView.findViewById<LinearLayout>(R.id.colorPicker)
        etName.setText(folder.name)
        setupColorPicker(colorContainer, folder.color)

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Klasörü Düzenle")
            .setView(dialogView)
            .setPositiveButton("Kaydet") { _, _ ->
                val name = etName.text.toString().trim()
                if (name.isEmpty()) {
                    Toast.makeText(requireContext(), "Klasör adı boş olamaz", Toast.LENGTH_SHORT).show()
                } else {
                    folder.name = name
                    folder.color = selectedColor
                    pdfManager.updateFolder(folder)
                    loadFolders()
                }
            }
            .setNegativeButton("İptal", null)
            .show()
    }

    private fun showDeleteConfirmDialog(folder: PdfFolder) {
        val count = pdfManager.getPdfCountInFolder(folder.id)
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Klasörü Sil")
            .setMessage("\"${folder.name}\" klasörünü silmek istiyor musunuz? ($count PDF atama kaldırılacak)")
            .setPositiveButton("Sil") { _, _ ->
                pdfManager.deleteFolder(folder.id)
                loadFolders()
            }
            .setNegativeButton("İptal", null)
            .show()
    }

    private fun setupColorPicker(container: LinearLayout, initialColor: String?) {
        container.removeAllViews()
        val size = resources.getDimensionPixelSize(R.dimen.color_circle_size)
        val margin = resources.getDimensionPixelSize(R.dimen.color_circle_margin)
        var selectedView: ImageView? = null

        folderColors.forEachIndexed { index, colorHex ->
            val iv = ImageView(requireContext()).apply {
                layoutParams = LinearLayout.LayoutParams(size, size).apply {
                    setMargins(margin, margin, margin, margin)
                }
                setImageResource(R.drawable.ic_circle)
                val color = android.graphics.Color.parseColor(colorHex)
                DrawableCompat.setTint(DrawableCompat.wrap(drawable).mutate(), color)
                alpha = if (colorHex == (initialColor ?: folderColors[0])) 1.0f else 0.4f
                if (colorHex == (initialColor ?: folderColors[0])) selectedView = this
            }
            iv.setOnClickListener {
                selectedColor = colorHex
                container.forEachImageView { it.alpha = 0.4f }
                iv.alpha = 1.0f
            }
            container.addView(iv)
        }
    }

    private fun LinearLayout.forEachImageView(action: (ImageView) -> Unit) {
        for (i in 0 until childCount) {
            val child = getChildAt(i)
            if (child is ImageView) action(child)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
