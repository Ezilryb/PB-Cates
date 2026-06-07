package com.example.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.data.LoyaltyCard
import com.example.data.ValidationLog
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// --- COULEURS DE BASE DU THEME PRINCIPAL PB-CARTES ---
val SlateDark = Color(0xFF0F172A)
val SlateMedium = Color(0xFF1E293B)
val SlateLight = Color(0xFF334155)
val EmeraldSuccess = Color(0xFF10B981)
val WarmOrange = Color(0xFFF97316)
val GoldenGold = Color(0xFFF59E0B)

@Composable
fun PBCartesApp(viewModel: LoyaltyViewModel) {
    val currentScreen by viewModel.currentScreen.collectAsStateWithLifecycle()
    val authState by viewModel.authUiState.collectAsStateWithLifecycle()
    val isAdminMode by viewModel.isAdminMode.collectAsStateWithLifecycle()
    val isWifiOffline by viewModel.isOfflineModeActive.collectAsStateWithLifecycle()

    // En fonction de l'état d'authentification, on force la connexion ou non
    val activeScreen = if (!authState.isLoggedIn && currentScreen != Screen.Login) {
        Screen.Login
    } else {
        currentScreen
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = SlateDark
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            
            // --- EN-TETE GLOBAL DE L'APPLICATION (PB-Cates / PB-Cartes) ---
            Surface(
                color = SlateMedium,
                tonalElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Filled.CardMembership,
                            contentDescription = "Wallet Logo",
                            tint = EmeraldSuccess,
                            modifier = Modifier
                                .size(32.dp)
                                .padding(end = 8.dp)
                        )
                        Column {
                            Text(
                                text = "PB-Cartes",
                                fontWeight = FontWeight.Bold,
                                fontSize = 20.sp,
                                color = Color.White,
                                fontFamily = FontFamily.SansSerif
                            )
                            Text(
                                text = "Solution Fidélité Passwordless",
                                fontSize = 10.sp,
                                color = Color.LightGray
                            )
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Indicateur d'état Wi-Fi (Simulateur Offline)
                        IconButton(
                            onClick = { viewModel.toggleOfflineMode() },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(
                                imageVector = if (isWifiOffline) Icons.Filled.WifiOff else Icons.Filled.Wifi,
                                contentDescription = "WiFi Status",
                                tint = if (isWifiOffline) Color.Red else EmeraldSuccess
                            )
                        }

                        if (authState.isLoggedIn) {
                            // Bouton d'accès Personnel / Administration en Caisse
                            IconButton(
                                onClick = {
                                    if (currentScreen == Screen.AdminDashboard) {
                                        viewModel.navigateTo(Screen.WalletList)
                                    } else {
                                        viewModel.navigateTo(Screen.AdminDashboard)
                                    }
                                },
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(
                                        if (currentScreen == Screen.AdminDashboard) EmeraldSuccess else SlateLight,
                                        CircleShape
                                    )
                            ) {
                                Icon(
                                    imageVector = if (currentScreen == Screen.AdminDashboard) Icons.Filled.Storefront else Icons.Filled.Settings,
                                    contentDescription = "Admin Switch",
                                    tint = Color.White
                                )
                            }

                            // Bouton Déconnexion
                            IconButton(
                                onClick = { viewModel.logout() },
                                modifier = Modifier.size(36.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Logout,
                                    contentDescription = "Logout",
                                    tint = Color.LightGray
                                )
                            }
                        }
                    }
                }
            }

            // Bannière d'avertissement Hors-Ligne (Simulé)
            AnimatedVisibility(
                visible = isWifiOffline,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF7F1D1D))
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Filled.WifiOff,
                            contentDescription = "Off",
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Mode Hors-ligne activé (Les tampons seront synchronisés dès reconconnexion)",
                            fontSize = 11.sp,
                            color = Color.White,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            // --- CONTENU PRINCIPAL PAR ECRAN ---
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            ) {
                when (activeScreen) {
                    Screen.Login -> LoginScreen(viewModel)
                    Screen.WalletList -> WalletListScreen(viewModel)
                    Screen.CardDetail -> CardDetailScreen(viewModel)
                    Screen.AdminDashboard -> AdminDashboardScreen(viewModel)
                }
            }
        }
    }
}

// ==========================================
// 1. ECRAN DE CONNEXION PASSWORDLESS (Magic Code / OTP)
// ==========================================
@Composable
fun LoginScreen(viewModel: LoyaltyViewModel) {
    val authState by viewModel.authUiState.collectAsStateWithLifecycle()
    val clipboardManager = LocalClipboardManager.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .widthIn(max = 500.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = SlateMedium),
            shape = RoundedCornerShape(24.dp),
            elevation = CardDefaults.cardElevation(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Logo Animé de Connexion
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .background(SlateLight, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.Email,
                        contentDescription = "Mail Logo",
                        tint = EmeraldSuccess,
                        modifier = Modifier.size(36.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Connexion Passwordless",
                    fontWeight = FontWeight.Bold,
                    fontSize = 22.sp,
                    color = Color.White,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Abonnements d'établissement PB-Cartes. Saisissez votre adresse email pour recevoir instantanément un Magic Code de validation.",
                    fontSize = 13.sp,
                    color = Color.LightGray,
                    textAlign = TextAlign.Center,
                    lineHeight = 18.sp
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Zone de saisie d'Email
                OutlinedTextField(
                    value = authState.emailInput,
                    onValueChange = { viewModel.updateEmailInput(it) },
                    label = { Text("Votre adresse email") },
                    placeholder = { Text("nom@exemple.com") },
                    singleLine = true,
                    enabled = !authState.isOtpSent && !authState.isLoading,
                    leadingIcon = { Icon(Icons.Filled.AlternateEmail, contentDescription = "At") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = EmeraldSuccess,
                        unfocusedBorderColor = SlateLight,
                        focusedLabelColor = EmeraldSuccess,
                        unfocusedLabelColor = Color.Gray,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Affichage d'erreur éventuelle
                authState.authError?.let { error ->
                    Text(
                        text = error,
                        color = Color.Red,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                }

                if (!authState.isOtpSent) {
                    // BOUTON ENVOYER LE CODE MAGIQUE
                    Button(
                        onClick = { viewModel.sendMagicCode() },
                        enabled = authState.emailInput.isNotEmpty() && !authState.isLoading,
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldSuccess),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                    ) {
                        if (authState.isLoading) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                        } else {
                            Text(
                                "Recevoir mon Magic Code",
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                } else {
                    // ZONE OTP / MAGIC CODE REÇU
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .animateContentSize()
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF064E3B), RoundedCornerShape(8.dp))
                                .clickable {
                                    clipboardManager.setText(AnnotatedString(authState.generatedOtp))
                                }
                                .padding(12.dp)
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                                Text(
                                    text = "📧 Magic Code envoyé à ${authState.emailInput}",
                                    fontSize = 11.sp,
                                    color = Color.LightGray,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center
                                ) {
                                    Text(
                                        text = "Votre code : ",
                                        fontSize = 12.sp,
                                        color = Color.White
                                    )
                                    Text(
                                        text = authState.generatedOtp,
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = EmeraldSuccess
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Icon(
                                        imageVector = Icons.Filled.ContentCopy,
                                        contentDescription = "Copy",
                                        tint = EmeraldSuccess,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                                Text(
                                    text = "(Cliquez pour copier ou tapez 1234 pour valider)",
                                    fontSize = 9.sp,
                                    color = Color.Gray
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        OutlinedTextField(
                            value = authState.otpInput,
                            onValueChange = { viewModel.updateOtpInput(it) },
                            label = { Text("Saisir le Magic Code (OTP)") },
                            placeholder = { Text("Ex: ${authState.generatedOtp}") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            leadingIcon = { Icon(Icons.Filled.Key, contentDescription = "OTP") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = EmeraldSuccess,
                                unfocusedBorderColor = SlateLight,
                                focusedLabelColor = EmeraldSuccess,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedButton(
                                onClick = { viewModel.logout() },
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.LightGray),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(50.dp)
                            ) {
                                Text("Retour")
                            }

                            Button(
                                onClick = { viewModel.verifyMagicCode() },
                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldSuccess),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .weight(1.5f)
                                    .height(50.dp)
                            ) {
                                Text("Se connecter", fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ==========================================
// 2. ECRAN DU PORTEFEUILLE CLIENTS (WALLET)
// ==========================================
@Composable
fun WalletListScreen(viewModel: LoyaltyViewModel) {
    val cards by viewModel.walletCards.collectAsStateWithLifecycle()
    val authState by viewModel.authUiState.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // En-tête avec profil utilisateur
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .background(SlateMedium, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Filled.Person,
                    contentDescription = "Profile",
                    tint = EmeraldSuccess,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = "Bienvenue dans votre Wallet !",
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    fontSize = 16.sp
                )
                Text(
                    text = authState.loggedEmail.ifEmpty { "Visiteur Anonyme" },
                    color = Color.LightGray,
                    fontSize = 12.sp,
                    overflow = TextOverflow.Ellipsis,
                    maxLines = 1
                )
            }
        }

        Divider(color = SlateMedium, thickness = 1.dp, modifier = Modifier.padding(bottom = 16.dp))

        Text(
            text = "Vos cartes de fidélité active",
            fontWeight = FontWeight.Bold,
            color = Color.White,
            fontSize = 18.sp,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        if (cards.isEmpty()) {
            // État vide
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = Icons.Filled.CreditCardOff,
                    contentDescription = "No cards",
                    tint = Color.Gray,
                    modifier = Modifier.size(64.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Aucune carte dans votre portefeuille.",
                    color = Color.LightGray,
                    fontSize = 14.sp
                )
            }
        } else {
            // Liste verticale des cartes (Le Wallet virtuel demandé)
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(cards, key = { it.id }) { card ->
                    WalletCardItem(
                        card = card,
                        onCardClick = { viewModel.selectCard(card.id) }
                    )
                }
            }
        }
    }
}

// Composant Carte de Fidélité unitaire dans le Wallet
@Composable
fun WalletCardItem(card: LoyaltyCard, onCardClick: () -> Unit) {
    val cardColor = remember(card.colorHex) {
        try {
            Color(android.graphics.Color.parseColor(card.colorHex))
        } catch (e: Exception) {
            Color(0xFF1E88E5)
        }
    }

    // Récupère l'icône associée
    val cardIcon = when (card.iconName) {
        "pizza" -> Icons.Filled.LocalPizza
        "burger" -> Icons.Filled.LunchDining
        else -> Icons.Filled.Restaurant
    }

    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = SlateMedium),
        elevation = CardDefaults.cardElevation(8.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .clickable(onClick = onCardClick)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth()
        ) {
            // En-tête de la carte avec couleur de l'entreprise
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(cardColor, cardColor.copy(alpha = 0.7f))
                        )
                    )
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .background(Color.White.copy(alpha = 0.2f), RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = cardIcon,
                                contentDescription = "Merchant Icon",
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = card.merchantName,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = card.merchantType,
                                fontSize = 11.sp,
                                color = Color.White.copy(alpha = 0.8f)
                            )
                        }
                    }

                    // Badge de Stamp actif
                    Box(
                        modifier = Modifier
                            .background(Color.Black.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "${card.stampCount} / 10",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (card.stampCount == 10) GoldenGold else Color.White
                        )
                    }
                }
            }

            // Corps de la carte : mini progression visuelle d'un coup d'oeil et détails du cadeau
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Text(
                    text = "Cadeau de fidélité au 10ème tampon :",
                    fontSize = 11.sp,
                    color = Color.LightGray
                )
                Text(
                    text = card.rewardDetail,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                // Rendu des 10 petits cercles de progression
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    for (i in 1..10) {
                        val active = i <= card.stampCount
                        Box(
                            modifier = Modifier
                                .size(20.dp)
                                .background(
                                    if (active) cardColor else SlateLight,
                                    CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            if (active) {
                                Icon(
                                    imageVector = Icons.Filled.Check,
                                    contentDescription = "done",
                                    tint = Color.White,
                                    modifier = Modifier.size(12.dp)
                                )
                            } else {
                                Text(
                                    text = i.toString(),
                                    fontSize = 8.sp,
                                    color = Color.Gray,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Bouton explicatif bas de carte
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Filled.Security,
                            contentDescription = "Secure",
                            tint = Color.Gray,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Magic Code & QR Dynamique",
                            fontSize = 11.sp,
                            color = Color.Gray
                        )
                    }

                    Text(
                        text = "Ouvrir la carte →",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = cardColor
                    )
                }
            }
        }
    }
}

// ==========================================
// 3. ECRAN DETAIL ET CANAL D'AUTHENTICATION PAR QR DYNAMIQUE
// ==========================================
@Composable
fun CardDetailScreen(viewModel: LoyaltyViewModel) {
    val activeCardId by viewModel.selectedCardId.collectAsStateWithLifecycle()
    val cards by viewModel.walletCards.collectAsStateWithLifecycle()
    val card = cards.firstOrNull { it.id == activeCardId }
    var showQrDialog by remember { mutableStateOf(false) }

    if (card == null) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text("Carte non trouvée")
            Button(onClick = { viewModel.navigateTo(Screen.WalletList) }) {
                Text("Retour Wallet")
            }
        }
        return
    }

    val cardColor = remember(card.colorHex) {
        try {
            Color(android.graphics.Color.parseColor(card.colorHex))
        } catch (e: Exception) {
            Color(0xFF1E88E5)
        }
    }

    val cardIcon = when (card.iconName) {
        "pizza" -> Icons.Filled.LocalPizza
        "burger" -> Icons.Filled.LunchDining
        else -> Icons.Filled.Restaurant
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Bouton de retour
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { viewModel.navigateTo(Screen.WalletList) },
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Retour à mon portefeuille",
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // GRANDE CARTE HERO VISUELLE DE PRESENTATION
        item {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = SlateMedium),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(cardColor, cardColor.copy(alpha = 0.6f))
                                )
                            )
                            .padding(24.dp)
                    ) {
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(48.dp)
                                        .background(Color.White.copy(alpha = 0.25f), RoundedCornerShape(12.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = cardIcon,
                                        contentDescription = "Logo detail",
                                        tint = Color.White,
                                        modifier = Modifier.size(28.dp)
                                    )
                                }

                                Text(
                                    text = "${card.stampCount} / 10 Tampons",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    modifier = Modifier
                                        .background(Color.Black.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                                        .padding(horizontal = 12.dp, vertical = 6.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(20.dp))

                            Text(
                                text = card.merchantName,
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )

                            Text(
                                text = card.merchantType,
                                fontSize = 12.sp,
                                color = Color.White.copy(alpha = 0.8f)
                            )
                        }
                    }

                    // Progression détaillée du bas de la carte
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text(
                            text = "Votre Récompense active au 10ème tampon :",
                            fontSize = 12.sp,
                            color = Color.LightGray
                        )
                        Text(
                            text = card.rewardDetail,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = GoldenGold,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // GRILLE DE TAMPONNAGE (10 cercles stylisés style carton d'origine)
                        Text(
                            text = "Cartouche de tampons de fidélité :",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.LightGray,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )

                        // Disposition en Grid flexible sur deux lignes (5 par ligne)
                        Column(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                for (i in 1..5) {
                                    StampBox(index = i, currentCount = card.stampCount, activeColor = cardColor, modifier = Modifier.weight(1f))
                                }
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                for (i in 6..10) {
                                    StampBox(index = i, currentCount = card.stampCount, activeColor = cardColor, modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            }
        }

        // CANAL A: LE QR CODE DYNAMIQUE (PLAN B)
        item {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = SlateMedium),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Filled.QrCode,
                        contentDescription = "Qr Icon",
                        tint = cardColor,
                        modifier = Modifier.size(48.dp)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Authentification Proximité : QR Code Dynamique",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Color.White,
                        textAlign = TextAlign.Center
                    )

                    Text(
                        text = "Si la saisie n'est pas possible (micro-coupure réseau caisse), présentez ce code dynamique au gérant. Le vendeur scannera ce écran pour valider vos tampons en caisse en toute sécurité.",
                        fontSize = 12.sp,
                        color = Color.LightGray,
                        textAlign = TextAlign.Center,
                        lineHeight = 16.sp,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = { showQrDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = cardColor),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Icon(imageVector = Icons.Filled.QrCodeScanner, contentDescription = "Scan icon")
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Afficher mon QR Code",
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }
        }

        // SIMULATION RAPIDE POUR LA DEMO CLIENT (TAMPONS EN DIRECT)
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = SlateMedium),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Outils de simulation de caisse (Client)",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { viewModel.addStamp(card.id, 1) },
                            enabled = card.stampCount < 10,
                            colors = ButtonDefaults.buttonColors(containerColor = SlateLight),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("+1 Tampon", fontSize = 11.sp)
                        }

                        if (card.stampCount == 10) {
                            Button(
                                onClick = { viewModel.redeemReward(card.id) },
                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldSuccess),
                                modifier = Modifier.weight(1.2f)
                            ) {
                                Text("Retirer Cadeau", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }

    // --- DIALOGUE QR CODE DYNAMIQUE AVEC TIMER REEL (Plan B) ---
    if (showQrDialog) {
        QrDynamiqueDialog(
            card = card,
            cardColor = cardColor,
            onDismiss = { showQrDialog = false }
        )
    }
}

// Case de tampon unitaire style Carton vintage
@Composable
fun StampBox(index: Int, currentCount: Int, activeColor: Color, modifier: Modifier = Modifier) {
    val isStamped = index <= currentCount
    
    Box(
        modifier = modifier
            .aspectRatio(1f)
            .clip(RoundedCornerShape(12.dp))
            .background(if (isStamped) activeColor.copy(alpha = 0.15f) else Color.Transparent)
            .border(
                width = 1.5.dp,
                color = if (isStamped) activeColor else SlateLight,
                shape = RoundedCornerShape(12.dp)
            ),
        contentAlignment = Alignment.Center
    ) {
        if (isStamped) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = Icons.Filled.CheckCircle,
                    contentDescription = "Stamped",
                    tint = activeColor,
                    modifier = Modifier.size(24.dp)
                )
                Text(
                    text = "OK",
                    fontSize = 9.sp,
                    color = activeColor,
                    fontWeight = FontWeight.Bold
                )
            }
        } else {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = index.toString(),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Gray
                )
                if (index == 10) {
                    Icon(
                        imageVector = Icons.Filled.Star,
                        contentDescription = "Gift",
                        tint = Color.Gray,
                        modifier = Modifier.size(12.dp)
                    )
                }
            }
        }
    }
}

// Dialogue QR Code interactif Plan B
@Composable
fun QrDynamiqueDialog(card: LoyaltyCard, cardColor: Color, onDismiss: () -> Unit) {
    var timerSeconds by remember { mutableStateOf(45) }
    var refreshTrigger by remember { mutableStateOf(0) }

    // Décompte de validité du QR code
    LaunchedEffect(key1 = timerSeconds, key2 = refreshTrigger) {
        if (timerSeconds > 0) {
            delay(1000)
            timerSeconds--
        } else {
            // Régénération automatique si expiré
            timerSeconds = 45
            refreshTrigger++
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = SlateMedium),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "QR Code Dynamique",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = Color.White
                )
                Text(
                    text = "PB-Cartes Security Code v2.4",
                    fontSize = 10.sp,
                    color = Color.Gray
                )

                Spacer(modifier = Modifier.height(20.dp))

                // DESSIN DU QR CODE FICTIF DYNAMIQUE SUR UN CANVAS
                Box(
                    modifier = Modifier
                        .size(180.dp)
                        .background(Color.White, RoundedCornerShape(16.dp))
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val strokeWidth = 3.dp.toPx()
                        
                        // Dessine les 3 carrés de coin du QR Code
                        val finderSize = size.width * 0.25f
                        
                        // Coin Haut gauche
                        drawRect(Color.Black, Offset.Zero, Size(finderSize, finderSize))
                        drawRect(Color.White, Offset(strokeWidth, strokeWidth), Size(finderSize - strokeWidth * 2, finderSize - strokeWidth * 2))
                        drawRect(Color.Black, Offset(strokeWidth * 2, strokeWidth * 2), Size(finderSize - strokeWidth * 4, finderSize - strokeWidth * 4))

                        // Coin Haut droit
                        drawRect(Color.Black, Offset(size.width - finderSize, 0f), Size(finderSize, finderSize))
                        drawRect(Color.White, Offset(size.width - finderSize + strokeWidth, strokeWidth), Size(finderSize - strokeWidth * 2, finderSize - strokeWidth * 2))
                        drawRect(Color.Black, Offset(size.width - finderSize + strokeWidth * 2, strokeWidth * 2), Size(finderSize - strokeWidth * 4, finderSize - strokeWidth * 4))

                        // Coin Bas gauche
                        drawRect(Color.Black, Offset(0f, size.height - finderSize), Size(finderSize, finderSize))
                        drawRect(Color.White, Offset(strokeWidth, size.height - finderSize + strokeWidth), Size(finderSize - strokeWidth * 2, finderSize - strokeWidth * 2))
                        drawRect(Color.Black, Offset(strokeWidth * 2, size.height - finderSize + strokeWidth * 2), Size(finderSize - strokeWidth * 4, finderSize - strokeWidth * 4))

                        // Points factices générés dynamiquement selon le trigger
                        val cellSize = size.width / 12f
                        val random = java.util.Random((card.stampCount * 123 + refreshTrigger).toLong())
                        
                        for (row in 0..11) {
                            for (col in 0..11) {
                                // Éviter de dessiner sur les 3 Finders principaux
                                val inTopLeft = row < 3 && col < 3
                                val inTopRight = row < 3 && col >= 9
                                val inBottomLeft = row >= 9 && col < 3
                                
                                if (!inTopLeft && !inTopRight && !inBottomLeft) {
                                    if (random.nextBoolean()) {
                                        drawRect(
                                            color = Color.Black,
                                            topLeft = Offset(col * cellSize, row * cellSize),
                                            size = Size(cellSize * 1.05f, cellSize * 1.05f)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Progress Bar du Timer
                LinearProgressIndicator(
                    progress = { timerSeconds / 45f },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(CircleShape),
                    color = cardColor,
                    trackColor = SlateLight
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Code OTP actif pour encore : ${timerSeconds}s",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.White
                )

                Text(
                    text = "Envoie l'identifiant crypté : ${card.id}_client_secure_${card.stampCount}",
                    fontSize = 9.sp,
                    color = Color.Gray,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = SlateLight),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Fermer", color = Color.White)
                }
            }
        }
    }
}

// ==========================================
// 4. INTERFACE ADMINISTRATION VENDEUR EN CAISSE (STAFF PARTAGÉ)
// ==========================================
@Composable
fun AdminDashboardScreen(viewModel: LoyaltyViewModel) {
    val cards by viewModel.walletCards.collectAsStateWithLifecycle()
    val logs by viewModel.validationLogs.collectAsStateWithLifecycle()
    val isOfflineModeActive by viewModel.isOfflineModeActive.collectAsStateWithLifecycle()

    var selectedMerchantIndex by remember { mutableStateOf(0) }
    val currentMerchant = cards.getOrNull(selectedMerchantIndex)
    val merchant = currentMerchant

    val merchantColor = remember(merchant?.colorHex) {
        try {
            Color(android.graphics.Color.parseColor(merchant?.colorHex ?: "#1E88E5"))
        } catch (e: Exception) {
            Color(0xFF1E88E5)
        }
    }

    var customReward by remember { mutableStateOf("") }
    var multiStampState by remember { mutableStateOf(true) }
    var dailyLimitState by remember { mutableStateOf("3") }
    var showExportSheet by remember { mutableStateOf(false) }

    // Dès que le marchand change, on recharge ses valeurs de config dans le formulaire
    LaunchedEffect(currentMerchant) {
        currentMerchant?.let {
            customReward = it.rewardDetail
            multiStampState = it.isMultiStampAllowed
            dailyLimitState = it.dailyLimit.toString()
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // En-tête de l'espace caisse
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = SlateMedium)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .background(Color(0xFF3B82F6), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Filled.Terminal, contentDescription = "Terminal", tint = Color.White)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Terminal Serveur Partagé",
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            fontSize = 15.sp
                        )
                        Text(
                            text = "Session active simultanée : Multi-terminau PC/TPV",
                            color = Color.LightGray,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }

        if (cards.isEmpty()) {
            item {
                Text("Chargement des commerces...", color = Color.White)
            }
        } else {
            // SÉLECTEUR DE RESTAURANT POUR SIMULATION SERVEUR
            item {
                Column {
                    Text(
                        text = "Établissement géré par le Staff :",
                        color = Color.LightGray,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(bottom = 6.dp)
                    )
                    ScrollableTabRow(
                        selectedTabIndex = selectedMerchantIndex,
                        containerColor = SlateDark,
                        edgePadding = 0.dp,
                        indicator = {},
                        divider = {}
                    ) {
                        cards.forEachIndexed { index, item ->
                            val selected = selectedMerchantIndex == index
                            Tab(
                                selected = selected,
                                onClick = { selectedMerchantIndex = index },
                                text = {
                                    Text(
                                        item.merchantName,
                                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                                        fontSize = 12.sp
                                    )
                                },
                                modifier = Modifier
                                    .padding(horizontal = 4.dp, vertical = 2.dp)
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(if (selected) EmeraldSuccess else SlateMedium)
                            )
                        }
                    }
                }
            }

            if (merchant != null) {
                // 1. ACTION DE CAISSE : DISTRIBUTION EN DIRECT (TAMPONNAGE)
                item {
                    Card(
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = SlateMedium),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.CheckCircle, contentDescription = "Dist", tint = EmeraldSuccess)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Validation Rapide de Tampons",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = Color.White
                                )
                            }

                            Text(
                                text = "Simule la validation physique en caisse (via scan QR Code Plan B ou click terminal).",
                                fontSize = 11.sp,
                                color = Color.LightGray,
                                modifier = Modifier.padding(vertical = 4.dp)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Button(
                                    onClick = { viewModel.addStamp(merchant.id, 1) },
                                    enabled = merchant.stampCount < 10,
                                    colors = ButtonDefaults.buttonColors(containerColor = merchantColor),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("+1 Tampon", fontWeight = FontWeight.Bold, color = Color.White)
                                }

                                if (merchant.isMultiStampAllowed) {
                                    Button(
                                        onClick = { viewModel.addStamp(merchant.id, 3) },
                                        enabled = merchant.stampCount <= 7,
                                        colors = ButtonDefaults.buttonColors(containerColor = GoldenGold),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("+3 Tampons", fontWeight = FontWeight.Bold, color = Color.White)
                                    }
                                }
                            }

                            if (merchant.stampCount == 10) {
                                Spacer(modifier = Modifier.height(12.dp))
                                Button(
                                    onClick = { viewModel.redeemReward(merchant.id) },
                                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldSuccess),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(Icons.Filled.CardGiftcard, contentDescription = "Gift", tint = Color.White)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Consommer le Cadeau & Reset", fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }
                    }
                }

                // 2. CONFIGURATION DES REGLES BUSINESS PAR LE GERANT
                item {
                    Card(
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = SlateMedium),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.Tune, contentDescription = "Rules", tint = GoldenGold)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Règles métier de ${merchant.merchantName}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = Color.White
                                )
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Custom Reward Input
                            OutlinedTextField(
                                value = customReward,
                                onValueChange = { customReward = it },
                                label = { Text("Nature du cadeau au 10ème tampon") },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = EmeraldSuccess,
                                    unfocusedBorderColor = SlateLight,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            // Multi-tampon Switch
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Autoriser le Multi-Tampons", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                                    Text("Permet d'ajouter plusieurs tampons d'un coup (ex: table)", fontSize = 11.sp, color = Color.LightGray)
                                }
                                Switch(
                                    checked = multiStampState,
                                    onCheckedChange = { multiStampState = it },
                                    colors = SwitchDefaults.colors(
                                        checkedThumbColor = EmeraldSuccess,
                                        checkedTrackColor = EmeraldSuccess.copy(alpha = 0.5f)
                                    )
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Daily anti-fraud limit
                            OutlinedTextField(
                                value = dailyLimitState,
                                onValueChange = { dailyLimitState = it },
                                label = { Text("Seuil anti-fraude quotidien") },
                                placeholder = { Text("Ex: 3 tampons max / jour / client") },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = EmeraldSuccess,
                                    unfocusedBorderColor = SlateLight,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            Button(
                                onClick = {
                                    val limit = dailyLimitState.toIntOrNull() ?: 3
                                    viewModel.updateMerchantRules(merchant.id, customReward, multiStampState, limit)
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = SlateLight),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Enregistrer les configurations métier", color = Color.White)
                            }
                        }
                    }
                }
            }
        }

        // 3. EXPORT EXCEL / CSV & JOURNAL D'HISTORIQUE DES LOGS (Offline resilient)
        item {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = SlateMedium),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.History, contentDescription = "History", tint = Color.LightGray)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Historique d'activité local",
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = Color.White
                            )
                        }

                        IconButton(onClick = { viewModel.clearHistory() }) {
                            Icon(Icons.Filled.DeleteSweep, contentDescription = "Clear logs", tint = Color.Gray)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Les validations effectuées hors-ligne s'enregistreront localement automatiquement sous pavé rouge.",
                        fontSize = 11.sp,
                        color = Color.LightGray
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    if (logs.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(SlateLight, RoundedCornerShape(10.dp))
                                .padding(16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Aucune validation dans l'historique local.", fontSize = 12.sp, color = Color.Gray)
                        }
                    } else {
                        // Affiche les 4 derniers logs
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            logs.take(4).forEach { log ->
                                LogRowItem(log)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = { showExportSheet = true },
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldSuccess),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Filled.FileDownload, contentDescription = "Excel", tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Exporter Data (Fichier Excel/CSV)", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    }

    if (showExportSheet) {
        ExportCsvDialog(
            csvString = viewModel.generateCsvData(),
            onDismiss = { showExportSheet = false }
        )
    }
}

// Ligne d'historique de log
@Composable
fun LogRowItem(log: ValidationLog) {
    val formatter = remember { SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.FRANCE) }
    val dateStr = formatter.format(Date(log.timestamp))

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(SlateLight, RoundedCornerShape(8.dp))
            .border(
                1.dp,
                if (log.isOfflineLogged) Color.Red.copy(alpha = 0.5f) else Color.Transparent,
                RoundedCornerShape(8.dp)
            )
            .padding(10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(log.merchantName, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                if (log.isOfflineLogged) {
                    Spacer(modifier = Modifier.width(6.dp))
                    Box(
                        modifier = Modifier
                            .background(Color.Red, RoundedCornerShape(4.dp))
                            .padding(horizontal = 4.dp, vertical = 2.dp)
                    ) {
                        Text("HORS-LIGNE", fontSize = 8.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
            Text(log.clientEmail, fontSize = 11.sp, color = Color.LightGray, overflow = TextOverflow.Ellipsis, maxLines = 1)
            Text(dateStr, fontSize = 9.sp, color = Color.Gray)
        }

        Text(
            text = if (log.stampsReceived == -10) "🎁 CADEAU REÇU" else "+${log.stampsReceived}",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = if (log.stampsReceived == -10) GoldenGold else EmeraldSuccess
        )
    }
}

// Dialogue d'exportation Data brute au format Excel/CSV
@Composable
fun ExportCsvDialog(csvString: String, onDismiss: () -> Unit) {
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current
    var copiedState by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = SlateMedium),
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.InsertDriveFile, contentDescription = "CSV", tint = EmeraldSuccess)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Données d'exportation CSV",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = Color.White
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Ce bloc représente le fichier Excel exporté. Le gérant extrait l'historique pour en faire un publipostage ou analyser la fidélité.",
                    fontSize = 11.sp,
                    color = Color.LightGray,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Bloc de texte imitant la console/le fichier brut
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp)
                        .background(SlateDark, RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Text(
                        text = csvString,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 10.sp,
                        color = Color.Green,
                        modifier = Modifier.fillMaxSize()
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Fermer", fontSize = 12.sp)
                    }

                    Button(
                        onClick = {
                            clipboardManager.setText(AnnotatedString(csvString))
                            copiedState = true
                        },
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldSuccess),
                        modifier = Modifier.weight(1.5f)
                    ) {
                        Icon(Icons.Filled.CopyAll, contentDescription = "C", modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(if (copiedState) "Copié !" else "Copier le CSV", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    }
}
