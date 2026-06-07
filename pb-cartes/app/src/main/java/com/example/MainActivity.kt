package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.room.Room
import com.example.data.LoyaltyDatabase
import com.example.data.LoyaltyRepository
import com.example.ui.LoyaltyViewModel
import com.example.ui.PBCartesApp
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {

    // Initialisation paresseuse de la base de données Room locale
    private val database by lazy {
        Room.databaseBuilder(
            applicationContext,
            LoyaltyDatabase::class.java,
            "loyalty_database"
        )
        .fallbackToDestructiveMigration() // Facilite les évolutions locales de schéma de données
        .build()
    }

    // Abstraction d'accès aux données via Deposit/Repository
    private val repository by lazy {
        LoyaltyRepository(database.loyaltyDao)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                // Restauration du ViewModel avec injection de dépendances manuelle
                val viewModel: LoyaltyViewModel = viewModel(
                    factory = LoyaltyViewModelFactory(repository)
                )
                
                // Lancement du composant racine orchestrant l'application
                PBCartesApp(viewModel = viewModel)
            }
        }
    }
}

// Factory personnalisée pour instancier notre ViewModel avec ses dépendances requises
class LoyaltyViewModelFactory(private val repository: LoyaltyRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(LoyaltyViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return LoyaltyViewModel(repository) as T
        }
        throw IllegalArgumentException("Classe ViewModel inconnue: ${modelClass.name}")
    }
}
