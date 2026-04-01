package com.example.pdforganizer.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.pdforganizer.R
import com.example.pdforganizer.databinding.ItemPdfBinding
import com.example.pdforganizer.model.PdfFile

class PdfAdapter(
    private val onPdfClick: (PdfFile) -> Unit,
    private val onAssignFolder: (PdfFile) -> Unit
) : RecyclerView.Adapter<PdfAdapter.ViewHolder>() {

    private var pdfs = listOf<PdfFile>()

    fun submitList(list: List<PdfFile>) {
        pdfs = list
        notifyDataSetChanged()
    }

    inner class ViewHolder(val binding: ItemPdfBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemPdfBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val pdf = pdfs[position]
        with(holder.binding) {
            tvName.text = pdf.displayName()
            tvMeta.text = "${pdf.formattedSize()} • ${pdf.formattedDate()}"
            if (pdf.folderId != null) {
                ivFolderBadge.visibility = View.VISIBLE
            } else {
                ivFolderBadge.visibility = View.GONE
            }
            btnFolder.contentDescription = root.context.getString(R.string.assign_folder)
            root.setOnClickListener { onPdfClick(pdf) }
            btnFolder.setOnClickListener { onAssignFolder(pdf) }
        }
    }

    override fun getItemCount() = pdfs.size
}
