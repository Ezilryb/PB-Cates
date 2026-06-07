# Guide d'Architecture Flutter & Code Portefeuille (Wallet) CLIENT

Ce document contient l'architecture cible en **Flutter** demandée pour l'application **PB-Cartes**, compatible avec le Web, Android et iOS. Elle est conçue pour fonctionner avec **Firebase Auth** (connexion sans mot de passe "Magic Code" OTP par Email) et **Cloud Firestore** avec résilience et mode hors-ligne natif.

---

## 1. Structure Recommandée du Projet Flutter

Afin d'obtenir une architecture modulaire, maintenable et propre (Clean Architecture simplifiée par fonction), organisez votre projet Flutter comme suit :

```text
lib/
│
├── main.dart                      # Point d'entrée de l'application & initialisation Firebase
│
├── core/                           # Composants transversaux ou utilitaires partagés
│   ├── theme/
│   │   └── brand_theme.dart       # Définition de la charte graphique de PB-Cartes (Mode Sombre/Ardoise Slate)
│   └── services/
│       └── firebase_service.dart  # Classe d'initialisation de Firebase (Firestore offline, Auth)
│
├── models/                        # Modèles de données de la marque blanche PB-Cartes
│   ├── loyalty_card.dart          # Modèle d'une carte de fidélité commerce (Trattoria, Bistro, etc.)
│   └── validation_log.dart        # Modèle d'enregistrement de tampon en direct (Anti-fraude)
│
└── screens/                       # Écrans fonctionnels de l'application
    ├── login_passwordless.dart    # Écran d'authentification par email Magic Code OTP
    └── wallet_screen.dart         # ÉCRAN DEMANDÉ : Le portefeuille de cartes de fidélité en liste verticale
```

---

## 2. Déclaration des Dépendances (`pubspec.yaml`)

Ajoutez ces dépendances clés pour l'accès aux données hors-ligne Firestore et l'état applicatif :

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Firebase et Authentification
  firebase_core: ^3.0.0
  firebase_auth: ^4.15.0
  cloud_firestore: ^4.13.0
  
  # Gestion des états et réactivité (Ex: Riverpod ou Provider)
  flutter_riverpod: ^2.4.0
  
  # Icônes modernes complémentaires (Style Apple / Material)
  cupertino_icons: ^1.0.6
```

---

## 3. Implémentation du Code Flutter : L'Écran du Portefeuille (`wallet_screen.dart`)

Voici le code Flutter propre, performant, modulaire et entièrement commenté en français pour l'affichage vertical de vos cartes de fidélité :

```dart
import 'package:flutter/material.dart';

/// -------------------------------------------------------------
/// MODEL: Modèle d'une Carte de Fidélité (loyalty_card.dart)
/// -------------------------------------------------------------
class LoyaltyCard {
  final String id;
  final String title;
  final String category;
  final int stampCount; // Nombre de tampons actuels du client (0 à 10)
  final String reward;  // Récompense débloquée au 10ème tampon
  final String colorHex;// Couleur principale de l'établissement en Hexadécimal
  final IconData icon;  // Icône représentative du commerce

  LoyaltyCard({
    required this.id,
    required this.title,
    required this.category,
    required this.stampCount,
    required this.reward,
    required this.colorHex,
    required this.icon,
  });

  // Convertit la couleur Hex String en widget Color Flutter
  Color get cardColor {
    try {
      final hex = colorHex.replaceAll('#', '');
      return Color(int.parse('FF$hex', radix: 16));
    } catch (_) {
      return Colors.blue; // Couleur secours
    }
  }
}

/// -------------------------------------------------------------
/// VIEW: Écran principal du Portefeuille Client (wallet_screen.dart)
/// -------------------------------------------------------------
class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  // Liste fictive de données de marque blanche pour modéliser le portefeuille
  // Ces données écouteront normalement un flux réel Firestore Stream (avec cache hors-ligne actif).
  final List<LoyaltyCard> _myCards = [
    LoyaltyCard(
      id: '1',
      title: 'La Trattoria',
      category: 'Cuisine Italienne',
      stampCount: 4,
      reward: 'Un Tiramisu fait maison offert !',
      colorHex: 'E54B27', // Rouge terre cuite
      icon: Icons.local_pizza_rounded,
    ),
    LoyaltyCard(
      id: '2',
      title: 'Le Bistrot du Coin',
      category: 'Bistro & Café',
      stampCount: 7,
      reward: 'Un grand café chaud & un croissant',
      colorHex: '1D4ED8', // Bleu nuit élégant
      icon: Icons.restaurant_rounded,
    ),
    LoyaltyCard(
      id: '3',
      title: 'The Burger Loft',
      category: 'Burgers Gourmets',
      stampCount: 2,
      reward: 'Frites fraîches épluchées & boisson offertes',
      colorHex: 'D97706', // Moutarde / Ambre d'inspiration vintage
      icon: Icons.lunch_dining_rounded,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    // Style de l'arrière-plan uniforme "PB-Cartes" (Ardoise sombre classe Slate)
    const slateDark = Color(0xFF0F172A);
    const slateMedium = Color(0xFF1E293B);

    return Scaffold(
      backgroundColor: slateDark,
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'PB-Cartes',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 20,
                color: Colors.white,
              ),
            ),
            Text(
              'Portefeuille de fidélité Multi-Commerce',
              style: TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
        backgroundColor: slateMedium,
        elevation: 0,
        actions: [
          // Bouton statut Connexion / Profil
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: CircleAvatar(
              backgroundColor: slateDark,
              child: const Icon(Icons.person_outline_rounded, color: Colors.emerald),
            ),
          )
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Info Client actif (S'il est connecté par Magic Code OTP)
              const Row(
                children: [
                  Icon(Icons.email_outlined, size: 16, color: Colors.grey),
                  SizedBox(width: 8),
                  Text(
                    'Client : betacapital.discord@gmail.com',
                    style: TextStyle(color: Colors.grey, fontSize: 13),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text(
                'Mon Portefeuille Virtuel',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              
              // Liste Verticale flexible des cartes de fidélité active du client
              Expanded(
                child: ListView.separated(
                  itemCount: _myCards.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    final card = _myCards[index];
                    return _buildLoyaltyCardItem(context, card);
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// -------------------------------------------------------------
  /// SUBCOMPOSANT : Élément unitaire d'une carte de fidélité du Wallet
  /// -------------------------------------------------------------
  Widget _buildLoyaltyCardItem(BuildContext context, LoyaltyCard card) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B), // Fond Ardoise Moyen pour contraste
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias, // Permet de respecter l'arrondi avec les bords colorés
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          // Action lors du clic sur le commerce : ouvre les détails ou affiche le QR Code Dynamique
          onTap: () {
            _showCardDetailsModal(context, card);
          },
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              
              // En-tête de carte arborant les couleurs de l'enseigne
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [card.cardColor, card.cardColor.withOpacity(0.7)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        // Icône du commerce décorative
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.25),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(card.icon, color: Colors.white, size: 24),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              card.title,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                              ),
                            ),
                            Text(
                              card.category,
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.8),
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    
                    // État global des tampons
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${card.stampCount} / 10',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Corps inférieur de la carte : récompenses et progression visuelle immédiate
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'RÉCOMPENSE AU 10ème TAMPON :',
                      style: TextStyle(color: Colors.silver, fontSize: 10, letterSpacing: 1),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      card.reward,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    
                    // Petite frise chronologique de 10 ronds de tampons
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: List.generate(10, (index) {
                        final isStamped = index < card.stampCount;
                        return Container(
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            color: isStamped ? card.cardColor : const Color(0xFF334155),
                            shape: BoxShape.circle,
                          ),
                          child: isStamped 
                            ? const Icon(Icons.check, size: 12, color: Colors.white)
                            : Center(
                                child: Text(
                                  '${index + 1}',
                                  style: const TextStyle(color: Colors.grey, fontSize: 8, fontWeight: FontWeight.bold),
                                ),
                              ),
                        );
                      }),
                    ),
                    
                    const SizedBox(height: 12),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Saisie en caisse sécurisée',
                          style: TextStyle(color: Colors.grey, fontSize: 11),
                        ),
                        Text(
                          'Détails & QR Code →',
                          style: TextStyle(
                            color: Colors.white70,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// -------------------------------------------------------------
  /// ACTION : Boîte modale simulant l'ouverture de la carte (QR Code Plan B)
  /// -------------------------------------------------------------
  void _showCardDetailsModal(BuildContext context, LoyaltyCard card) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[700],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                card.title,
                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
              ),
              Text(
                card.category,
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
              const SizedBox(height: 16),
              
              // Simulation d'un QR code pour validation caisse proximité (Canal A / Plan B)
              const Icon(Icons.qr_code_2_rounded, size: 140, color: Colors.white),
              const SizedBox(height: 12),
              const Text(
                'QR Code Dynamique Plan B',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
                child: Text(
                  'Présentez ce code au marchand si le réseau est trop encombré ou instable.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey, fontSize: 11, height: 1.4),
                ),
              ),
              const SizedBox(height: 18),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: card.cardColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  minimumSize: const Size.fromHeight(48),
                ),
                onPressed: () => Navigator.pop(context),
                child: const Text('Fermer la carte', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      },
    );
  }
}
```

---

## 4. Stratégie de Résilience & Mode Hors-Ligne Automatique (Cloud Firestore)

Pour satisfaire le critère **"Gestion des Données & Résilience Internet (Mode Hors-Ligne Vendeur)"**, assurez-vous d'activer explicitement le gestionnaire de persistance Firestore lors du démarrage de l'application Flutter.

Dans votre `firebase_service.dart` (ou `main.dart`) :

```dart
import 'package:cloud_firestore/cloud_firestore.dart';

class FirebaseService {
  static Future<void> initializeSettings() async {
    // Active le stockage local et le cache automatique pour Firestore
    // Compatible et synchronisé par défaut avec Android, iOS et le Web.
    FirebaseFirestore.instance.settings = const Settings(
      persistenceEnabled: true,
      cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
    );
  }
}
```

Ainsi, dès que le serveur ou le gérant attribue un tampon (écriture locale d'un document log dans Firestore), **la donnée est immédiatement acceptée hors-ligne** et s'affiche instantanément dans l'application locale. Firebase gère la reconnexion et la synchronisation en tâche de fond de façon transparente pour l'utilisateur.
