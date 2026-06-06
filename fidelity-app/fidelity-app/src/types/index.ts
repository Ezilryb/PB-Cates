// ============================================================
// Types globaux de l'application
// ============================================================

export interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  color: string;
  stamps_required: number;
  reward_description: string;
  multi_stamp_enabled: boolean;
  max_stamps_per_visit: number;
  max_stamps_per_day: number;
  is_active: boolean;
  created_at: string;
}

export interface StaffAccount {
  id: string;
  restaurant_id: string;
  email: string;
  role: "staff" | "admin";
  created_at: string;
}

export interface Customer {
  id: string;
  email: string;
  created_at: string;
}

export interface LoyaltyCard {
  id: string;
  customer_id: string;
  restaurant_id: string;
  current_stamps: number;
  total_stamps_earned: number;
  total_rewards_earned: number;
  created_at: string;
}

export interface StampEvent {
  id: string;
  card_id: string;
  stamps_added: number;
  staff_id: string | null;
  note: string | null;
  offline_id: string | null;
  created_at: string;
}

export interface RewardRedemption {
  id: string;
  card_id: string;
  staff_id: string | null;
  created_at: string;
}

// Données enrichies pour l'affichage du portefeuille client
export interface WalletCard extends LoyaltyCard {
  restaurant: Restaurant;
}

// Session JWT payload
export interface SessionPayload {
  userId: string;      // customer.id ou staff_account.id
  email: string;
  role: "customer" | "staff" | "admin";
  restaurantId?: string;  // présent pour staff et admin
}

// File d'attente hors-ligne (IndexedDB)
export interface PendingStamp {
  offlineId: string;   // UUID généré côté client pour la déduplication
  qrToken: string;     // Token JWT scanné depuis le QR code
  stampCount: number;
  restaurantId: string;
  timestamp: number;
}

// Résultat de la vérification d'un QR code
export interface QRVerifyResult {
  success: boolean;
  customerId?: string;
  email?: string;
  cardId?: string;
  currentStamps?: number;
  stampsAdded?: number;
  newTotal?: number;
  rewardUnlocked?: boolean;
  error?: string;
}

// Stats pour le dashboard admin
export interface AdminStats {
  totalCustomers: number;
  activeCards: number;
  stampsThisWeek: number;
  rewardsGiven: number;
  recentEvents: RecentEvent[];
}

export interface RecentEvent {
  id: string;
  customer_email: string;
  stamps_added: number;
  created_at: string;
}
