package com.example.data

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

class LoyaltyRepository(private val dao: LoyaltyDao) {

    // Récupère toutes les cartes de fidélité du portefeuille en temps réel
    val allCards: Flow<List<LoyaltyCard>> = dao.getAllCardsFlow()

    // Récupère l'historique complet des validations de tampons
    val allLogs: Flow<List<ValidationLog>> = dao.getAllLogsFlow()

    // Initialise des données fictives de marque blanche si la base est vide à la première exécution
    suspend fun initializeDefaultMerchantsIfNeeded() {
        val currentCards = allCards.first()
        if (currentCards.isEmpty()) {
            val defaults = listOf(
                LoyaltyCard(
                    id = "trattoria",
                    merchantName = "La Trattoria",
                    merchantType = "Cuisine Italienne",
                    stampCount = 4, // Débute avec 4 tampons pour la démo
                    rewardDetail = "Tiramisu Maison Offert !",
                    colorHex = "#E54B27", // Rouge terre cuite chaleureux
                    iconName = "pizza",
                    isMultiStampAllowed = true,
                    dailyLimit = 3
                ),
                LoyaltyCard(
                    id = "bistrot",
                    merchantName = "Le Bistrot du Coin",
                    merchantType = "Bistro & Café",
                    stampCount = 7, // Débute avec 7 tampons pour la démo
                    rewardDetail = "Grand Café & Croissant Chaud",
                    colorHex = "#1D4ED8", // Bleu nuit élégant
                    iconName = "dining",
                    isMultiStampAllowed = false, // Règle stricte : 1 seul tampon par visite
                    dailyLimit = 1
                ),
                LoyaltyCard(
                    id = "burger_loft",
                    merchantName = "The Burger Loft",
                    merchantType = "Burgers Gourmet",
                    stampCount = 2, // Débute avec 2 tampons pour la démo
                    rewardDetail = "Frites Maison & Soda Offerts",
                    colorHex = "#D97706", // Ambre / Moutarde vintage
                    iconName = "burger",
                    isMultiStampAllowed = true,
                    dailyLimit = 5
                )
            )
            for (card in defaults) {
                dao.insertOrUpdateCard(card)
            }
        }
    }

    // Ajoute un ou plusieurs tampons sur la carte d'un commerce
    suspend fun addStampsToCard(cardId: String, count: Int, clientEmail: String, offlineMode: Boolean): Boolean {
        val card = dao.getCardById(cardId) ?: return false
        
        // Vérification anti-fraude: limite par jour si configuré
        // (Dans ce simulateur, on applique directement la démo visuelle du contrôle)
        val newCount = card.stampCount + count
        val finalCount = if (newCount >= 10) 10 else newCount
        
        dao.updateStampCount(cardId, finalCount, System.currentTimeMillis())
        
        // Enregistre la transaction dans l'historique exportable
        dao.insertLog(
            ValidationLog(
                cardId = cardId,
                merchantName = card.merchantName,
                clientEmail = clientEmail,
                stampsReceived = count,
                isOfflineLogged = offlineMode
            )
        )
        return true
    }

    // Réinitialise la carte (lors du retrait de la récompense au 10ème tampon)
    suspend fun redeemRewardAndReset(cardId: String, clientEmail: String): Boolean {
        val card = dao.getCardById(cardId) ?: return false
        if (card.stampCount < 10) return false
        
        dao.updateStampCount(cardId, 0, System.currentTimeMillis())
        
        dao.insertLog(
            ValidationLog(
                cardId = cardId,
                merchantName = card.merchantName,
                clientEmail = clientEmail,
                stampsReceived = -10, // Indique un échange de récompense
                isOfflineLogged = false
            )
        )
        return true
    }

    // Met à jour les règles business paramétrées par le gérant
    suspend fun updateMerchantRules(
        cardId: String,
        rewardDetail: String,
        isMultiStampAllowed: Boolean,
        dailyLimit: Int
    ) {
        val card = dao.getCardById(cardId) ?: return
        val updated = card.copy(
            rewardDetail = rewardDetail,
            isMultiStampAllowed = isMultiStampAllowed,
            dailyLimit = dailyLimit
        )
        dao.insertOrUpdateCard(updated)
    }

    // Vide l'historique complet des logs de fidélité
    suspend fun clearAllHistoryLogs() {
        dao.clearLogs()
    }
}
