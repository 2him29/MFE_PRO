package com.example.evcharge.data

import android.content.Context
import com.example.evcharge.network.ApiClient
import com.example.evcharge.network.ApiService
import com.example.evcharge.network.CreateTicketRequest
import com.example.evcharge.network.CreateTicketResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Submits a "Report a Problem" ticket. The server creates a row in `tickets`,
 * broadcasts `new_app_ticket` over WebSocket and any technician on the
 * dashboard sees the report in their "My Tasks" page in real time.
 */
class TicketRepository(context: Context) {

    private val tokenStore = TokenStore(context.applicationContext)

    /**
     * Category strings must match the server's `tickets.category` enum:
     * `power_failure | screen_issue | charger_fault | system_failure | network_issue | maintenance`.
     */
    suspend fun report(
        stationId: String,
        category: String,
        description: String?,
    ): Result<CreateTicketResponse> = withContext(Dispatchers.IO) {
        val token = tokenStore.token()
            ?: return@withContext Result.failure(Exception("Not signed in"))

        try {
            val api = ApiClient.authenticatedRetrofit().create(ApiService::class.java)
            val resp = api.reportProblem(
                token = "Bearer $token",
                body  = CreateTicketRequest(stationId, category, description?.takeIf { it.isNotBlank() }),
            )
            if (resp.isSuccessful && resp.body() != null) Result.success(resp.body()!!)
            else                                          Result.failure(Exception("Server error: ${resp.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
