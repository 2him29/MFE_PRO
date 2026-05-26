package com.example.evcharge.data

import android.content.Context
import com.example.evcharge.network.ApiClient
import com.example.evcharge.network.ApiService
import com.example.evcharge.network.StartSessionRequest
import com.example.evcharge.network.StartSessionResponse
import com.example.evcharge.network.StopSessionRequest
import com.example.evcharge.network.StopSessionResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Posts charging-session lifecycle events. When the user taps "Start Charging",
 * the server creates the session, sets the station to "charging" and broadcasts
 * a `new_app_session` WS event to the dashboard.
 */
class SessionRepository(context: Context) {

    private val tokenStore = TokenStore(context.applicationContext)

    suspend fun startSession(
        stationId: String,
        paymentMethod: String,
    ): Result<StartSessionResponse> = withContext(Dispatchers.IO) {
        val token = tokenStore.token()
            ?: return@withContext Result.failure(Exception("Not signed in"))

        val serverPayment = when (paymentMethod.lowercase()) {
            "card", "credit", "credit/debit card", "debit card" -> "cib"
            "wallet", "digital wallet", "mobile", "mobile payment" -> "epayment"
            "rfid", "rfid card" -> "rfid_card"
            else -> "cib"
        }

        try {
            val api = ApiClient.authenticatedRetrofit().create(ApiService::class.java)
            val resp = api.startSession(
                token = "Bearer $token",
                body  = StartSessionRequest(stationId, serverPayment),
            )
            if (resp.isSuccessful && resp.body() != null) Result.success(resp.body()!!)
            else                                          Result.failure(Exception("Server error: ${resp.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun stopSession(sessionId: String): Result<StopSessionResponse> =
        withContext(Dispatchers.IO) {
            val token = tokenStore.token()
                ?: return@withContext Result.failure(Exception("Not signed in"))
            try {
                val api = ApiClient.authenticatedRetrofit().create(ApiService::class.java)
                val resp = api.stopSession(
                    token     = "Bearer $token",
                    sessionId = sessionId,
                    body      = StopSessionRequest(),
                )
                if (resp.isSuccessful && resp.body() != null) Result.success(resp.body()!!)
                else Result.failure(Exception("Server error: ${resp.code()}"))
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
}
