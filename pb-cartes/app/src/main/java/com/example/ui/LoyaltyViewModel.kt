package com.example.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.LoyaltyCard
import com.example.data.LoyaltyRepository
import com.example.data.ValidationLog
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlin.random.Random

// Structure de l'état de l'authentification Passwordless
data class AuthUiState(
    val emailInput: String = "",
    val otpInput: String = "",
    val isOtpSent: Boolean = false,
    val generatedOtp: String = "",
    val isLoggedIn: Boolean = false,
    val loggedEmail: String = "",
    val authError: String? = null,
    val isLoading: Boolean = false
)

class LoyaltyViewModel(private val repository: LoyaltyRepository) : ViewModel() {

    // --- ÉTAT NAVIGATION INTERNE ---
    // Gère le flux entre l'accueil du portefeuille, le détail et l'administration
    private val _currentScreen = MutableStateFlow<Screen>(Screen.WalletList)
    val currentScreen: StateFlow<Screen> = _currentScreen.asStateFlow()

    private val _selectedCardId = MutableStateFlow<String?>(null)
    val selectedCardId: StateFlow<String?> = _selectedCardId.asStateFlow()

    // --- ÉTAT AUTHENTIFICATION PASSWORDLESS ---
    private val _authUiState = MutableStateFlow(AuthUiState())
    val authUiState: StateFlow<AuthUiState> = _authUiState.asStateFlow()

    // --- ÉTAT MODE SIMULATION OFF-LINE & SECURITE VENDOR ---
    private val _isOfflineModeActive = MutableStateFlow(false)
    val isOfflineModeActive: StateFlow<Boolean> = _isOfflineModeActive.asStateFlow()

    // --- ÉTAT COMPTE STAFF PARTAGE ---
    // Permet de basculer instantanément de l'interface client à celle de caisse partagée
    private val _isAdminMode = MutableStateFlow(false)
    val isAdminMode: StateFlow<Boolean> = _isAdminMode.asStateFlow()

    // --- EXPOSITION DES DONNÉES REACTIVES ---
    // Liste des cartes de fidélité du Wallet synchronisées en local
    val walletCards: StateFlow<List<LoyaltyCard>> = repository.allCards
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    // Historique des logs pour l'export Excel / CSV
    val validationLogs: StateFlow<List<ValidationLog>> = repository.allLogs
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    init {
        // Initialisation de la base de données avec des restaurants de démonstration
        viewModelScope.launch {
            repository.initializeDefaultMerchantsIfNeeded()
        }
    }

    // --- ACTIONS NAVIGATION ---
    fun navigateTo(screen: Screen) {
        _currentScreen.value = screen
    }

    fun selectCard(cardId: String) {
        _selectedCardId.value = cardId
        navigateTo(Screen.CardDetail)
    }

    // --- ACTIONS D'AUTHENTIFICATION (PASSWORDLESS) ---
    fun updateEmailInput(email: String) {
        _authUiState.value = _authUiState.value.copy(emailInput = email, authError = null)
    }

    fun updateOtpInput(otp: String) {
        _authUiState.value = _authUiState.value.copy(otpInput = otp, authError = null)
    }

    // Simule l'envoi d'un Magic Code OTP magnétique par Email
    fun sendMagicCode() {
        val email = _authUiState.value.emailInput.trim()
        if (email.isEmpty() || !email.contains("@") || !email.contains(".")) {
            _authUiState.value = _authUiState.value.copy(authError = "Veuillez entrer une adresse email valide.")
            return
        }

        _authUiState.value = _authUiState.value.copy(isLoading = true)

        viewModelScope.launch {
            // Simulation d'un délai d'envoi réseau
            kotlinx.coroutines.delay(1000)
            
            // On génère un code OTP unique de 4 chiffres pour la démo
            val verificationCode = (1000 + Random.nextInt(9000)).toString()
            
            _authUiState.value = _authUiState.value.copy(
                isLoading = false,
                isOtpSent = true,
                generatedOtp = verificationCode,
                authError = null
            )
        }
    }

    // Valide le Magic Code et connecte l'utilisateur
    fun verifyMagicCode() {
        val uiState = _authUiState.value
        val codeSaisi = uiState.otpInput.trim()

        if (codeSaisi.isEmpty()) {
            _authUiState.value = _authUiState.value.copy(authError = "Veuillez saisir le code reçu.")
            return
        }

        if (codeSaisi == uiState.generatedOtp || codeSaisi == "1234") { // "1234" sert de code universel de secours
            _authUiState.value = _authUiState.value.copy(
                isLoggedIn = true,
                loggedEmail = uiState.emailInput,
                otpInput = "",
                isOtpSent = false,
                authError = null
            )
            _currentScreen.value = Screen.WalletList
        } else {
            _authUiState.value = _authUiState.value.copy(authError = "Code invalide. Essayez '1234' ou le code généré.")
        }
    }

    // Déconnexion de l'utilisateur clients ou employés
    fun logout() {
        _authUiState.value = AuthUiState()
        _isAdminMode.value = false
        _currentScreen.value = Screen.Login
    }

    // --- ACTIONS TAMTPONNAGE & RÈGLES BUSINESS (MODÈLE SIMULATION) ---
    
    // Alterne l'état de connexion WiFi vendeur pour tester la résilience
    fun toggleOfflineMode() {
        _isOfflineModeActive.value = !_isOfflineModeActive.value
    }

    // Bascule entre l'administration du personnel et le portefeuille client
    fun toggleAdminMode() {
        _isAdminMode.value = !_isAdminMode.value
    }

    // Attribue un tampon (Simule la caméra ou la caisse qui scanne)
    fun addStamp(cardId: String, count: Int = 1) {
        val clientEmail = _authUiState.value.loggedEmail.ifEmpty { "client.demo@pb-cartes.com" }
        val offline = _isOfflineModeActive.value

        viewModelScope.launch {
            repository.addStampsToCard(cardId, count, clientEmail, offline)
        }
    }

    // Échange la récompense du 10ème tampon et remet à zéro la carte
    fun redeemReward(cardId: String) {
        val clientEmail = _authUiState.value.loggedEmail.ifEmpty { "client.demo@pb-cartes.com" }
        viewModelScope.launch {
            repository.redeemRewardAndReset(cardId, clientEmail)
        }
    }

    // Modifie les règles métier du restaurant de façon étanche
    fun updateMerchantRules(cardId: String, rewardDetail: String, multiStamp: Boolean, limit: Int) {
        viewModelScope.launch {
            repository.updateMerchantRules(cardId, rewardDetail, multiStamp, limit)
        }
    }

    // Efface l'historique complet pour la démonstration
    fun clearHistory() {
        viewModelScope.launch {
            repository.clearAllHistoryLogs()
        }
    }

    // Prépare une chaîne brute au format CSV prête à l'export
    fun generateCsvData(): String {
        val logs = validationLogs.value
        if (logs.isEmpty()) return "Date;Restaurant;Client;Tampons;Mode\n"
        
        val builder = java.lang.StringBuilder()
        builder.append("Date;Restaurant;Client;Tampons;Mode\n")
        
        val formatter = java.text.SimpleDateFormat("dd/MM/yyyy HH:mm:ss", java.util.Locale.FRANCE)
        
        for (log in logs) {
            val dateStr = formatter.format(java.util.Date(log.timestamp))
            val actionType = if (log.stampsReceived == -10) "RÉCOMPENSE ÉCHANGÉE" else "+${log.stampsReceived} Tampons"
            val syncMode = if (log.isOfflineLogged) "HORS-LIGNE" else "DIRECT"
            builder.append("$dateStr;${log.merchantName};${log.clientEmail};$actionType;$syncMode\n")
        }
        return builder.toString()
    }
}

// Représentation des écrans de notre prototype
sealed class Screen {
    object Login : Screen()       // Écran d'authentification par email Magic Code
    object WalletList : Screen()  // Écran principal (Le Portefeuille virtuel de cartes - Wallet)
    object CardDetail : Screen()  // Écran détaillé de la carte de fidélité sélectionnée
    object AdminDashboard : Screen() // Interface Administrateur pour la gestion en Caisse et paramétrage
}
