package com.example.pdforganizer.adapter

import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.graphics.drawable.DrawableCompat
import androidx.recyclerview.widget.RecyclerView
import com.example.pdforganizer.databinding.ItemFolderBinding
import com.example.pdforganizer.manager.PdfManager
import com.example.pdforganizer.model.PdfFolder

class FolderAdapter(
    private val onFolderClick: (PdfFolder) -> Unit,
    private val onFolderEdit: (PdfFolder) -> Unit,
    private val onFolderDelete: (PdfFolder) -> Unit
) : RecyclerView.Adapter<FolderAdapter.ViewHolder>() {

    private var folders = listOf<PdfFolder>()
    private var pdfManager: PdfManager? = null

    fun submitList(list: List<PdfFolder>, manager: PdfManager) {
        folders = list
        pdfManager = manager
        notifyDataSetChanged()
    }

    inner class ViewHolder(val binding: ItemFolderBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemFolderBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val folder = folders[position]
        with(holder.binding) {
            tvName.text = folder.name
            val count = pdfManager?.getPdfCountInFolder(folder.id) ?: 0
            tvCount.text = "$count PDF"

            try {
                val color = Color.parseColor(folder.color)
                DrawableCompat.setTint(DrawableCompat.wrap(ivFolder.drawable).mutate(), color)
            } catch (_: Exception) {}

            root.setOnClickListener { onFolderClick(folder) }
            btnEdit.setOnClickListener { onFolderEdit(folder) }
            btnDelete.setOnClickListener { onFolderDelete(folder) }
        }
    }

    override fun getItemCount() = folders.size
}
