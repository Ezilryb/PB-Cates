package com.example.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

// --- ENTITIES ---

@Entity(tableName = "loyalty_cards")
data class LoyaltyCard(
    @PrimaryKey val id: String,
    val merchantName: String,
    val merchantType: String,
    val stampCount: Int = 0, // Current client stamps (0 to 10)
    val rewardDetail: String = "Café & Croissant Offerts", // Reward description at 10 stamps
    val colorHex: String = "#1E88E5", // Theme color for this white-label merchant
    val iconName: String = "dining", // Visual type: "pizza", "dining", "burger"
    val isMultiStampAllowed: Boolean = true, // Vendor configuration rule
    val dailyLimit: Int = 3, // Anti-fraud: max stamps allowed per client per day
    val lastValidatedTimestamp: Long = 0L // Last validation timestamp
)

@Entity(tableName = "validation_logs")
data class ValidationLog(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val cardId: String,
    val merchantName: String,
    val clientEmail: String,
    val stampsReceived: Int,
    val timestamp: Long = System.currentTimeMillis(),
    val isOfflineLogged: Boolean = false // Simulation of offline validation distributed locally first
)

// --- DAO (DATA ACCESS OBJECT) ---

@Dao
interface LoyaltyDao {
    @Query("SELECT * FROM loyalty_cards ORDER BY merchantName ASC")
    fun getAllCardsFlow(): Flow<List<LoyaltyCard>>

    @Query("SELECT * FROM loyalty_cards WHERE id = :id")
    suspend fun getCardById(id: String): LoyaltyCard?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateCard(card: LoyaltyCard)

    @Query("UPDATE loyalty_cards SET stampCount = :stampCount, lastValidatedTimestamp = :timestamp WHERE id = :cardId")
    suspend fun updateStampCount(cardId: String, stampCount: Int, timestamp: Long)

    @Query("SELECT * FROM validation_logs ORDER BY timestamp DESC")
    fun getAllLogsFlow(): Flow<List<ValidationLog>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLog(log: ValidationLog)

    @Query("DELETE FROM validation_logs")
    suspend fun clearLogs()
}

// --- DATABASE ---

@Database(entities = [LoyaltyCard::class, ValidationLog::class], version = 1, exportSchema = false)
abstract class LoyaltyDatabase : RoomDatabase() {
    abstract val loyaltyDao: LoyaltyDao
}
