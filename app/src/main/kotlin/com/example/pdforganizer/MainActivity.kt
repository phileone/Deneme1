package com.example.pdforganizer

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.example.pdforganizer.databinding.ActivityMainBinding
import com.example.pdforganizer.ui.AllPdfsFragment
import com.example.pdforganizer.ui.FoldersFragment

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val allPdfsFragment = AllPdfsFragment()
    private val foldersFragment = FoldersFragment()
    private var activeFragment: Fragment = allPdfsFragment

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction()
                .add(R.id.fragmentContainer, foldersFragment, "folders").hide(foldersFragment)
                .add(R.id.fragmentContainer, allPdfsFragment, "allPdfs")
                .commit()
        }

        binding.bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_all_pdfs -> showFragment(allPdfsFragment)
                R.id.nav_folders -> showFragment(foldersFragment)
            }
            true
        }
    }

    private fun showFragment(fragment: Fragment) {
        supportFragmentManager.beginTransaction()
            .hide(activeFragment)
            .show(fragment)
            .commit()
        activeFragment = fragment
    }
}
