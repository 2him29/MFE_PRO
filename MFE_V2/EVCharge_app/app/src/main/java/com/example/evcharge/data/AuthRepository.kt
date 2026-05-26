package com.example.evcharge.data

import android.content.Context
import com.example.evcharge.network.ApiClient
import com.example.evcharge.network.ApiService
import com.example.evcharge.network.AppUserResponse
import com.example.evcharge.network.FcmTokenRequest
import com.example.evcharge.network.LoginRequest
import com.example.evcharge.network.RegisterRequest
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

/**
 * Talks to the Express server's app-auth endpoints (login/register/fcm-token)
 * and persists the returned JWT. After login it also pushes the device's FCM
 * token so the server can target this device for push notifications.
 */
class AuthRepository(context: Context) {

    private val store = TokenStore(context.applicationContext)
    private val api: ApiService = ApiClient.retrofit.create(ApiService::class.java)

    suspend fun login(email: String, password: String): Result<AppUser> =
        withContext(Dispatchers.IO) {
            try {
                val resp = api.login(LoginRequest(email, password))
                val body = resp.body()
                if (!resp.isSuccessful || body == null) {
                    Result.failure(Exception(parseError(resp.errorBody()?.string(), resp.code())))
                } else {
                    val user = body.user.toAppUser()
                    store.save(body.token, user)
                    registerFcmToken()
                    Result.success(user)
                }
            } catch (e: Exception) { Result.failure(e) }
        }

    suspend fun register(
        email: String,
        password: String,
        fullName: String,
        phone: String?,
    ): Result<AppUser> = withContext(Dispatchers.IO) {
        try {
            val resp = api.register(RegisterRequest(email, password, fullName, phone))
            val body = resp.body()
            if (!resp.isSuccessful || body == null) {
                Result.failure(Exception(parseError(resp.errorBody()?.string(), resp.code())))
            } else {
                val user = body.user.toAppUser()
                store.save(body.token, user)
                registerFcmToken()
                Result.success(user)
            }
        } catch (e: Exception) { Result.failure(e) }
    }

    fun logout() = store.clear()

    private suspend fun registerFcmToken() {
        try {
            val fcm = FirebaseMessaging.getInstance().token.await()
            val auth = store.token() ?: return
            val authApi = ApiClient.authenticatedRetrofit().create(ApiService::class.java)
            authApi.registerFcmToken("Bearer $auth", FcmTokenRequest(fcm))
        } catch (e: Exception) {
            android.util.Log.w("AuthRepository", "FCM registration failed: ${e.message}")
        }
    }

    private fun AppUserResponse.toAppUser() = AppUser(
        appUserId = appUserId,
        email     = email,
        fullName  = full_name,
        phone     = phone,
    )

    private fun parseError(body: String?, code: Int): String {
        if (body.isNullOrEmpty()) return "Server error ($code)"
        return Regex("\"error\"\\s*:\\s*\"([^\"]+)\"")
            .find(body)?.groupValues?.getOrNull(1)
            ?: "Server error ($code)"
    }
}
