package com.example.evcharge.data

import android.content.Context
import com.example.evcharge.network.ApiClient

/**
 * SharedPreferences-backed store for the JWT and current user.
 * The FCM service reads "auth_token" from these prefs — keep the key in sync.
 */
class TokenStore(context: Context) {

    private val prefs = context
        .applicationContext
        .getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun save(token: String, user: AppUser) {
        prefs.edit()
            .putString(KEY_TOKEN,     token)
            .putString(KEY_USER_ID,   user.appUserId)
            .putString(KEY_EMAIL,     user.email)
            .putString(KEY_FULL_NAME, user.fullName)
            .putString(KEY_PHONE,     user.phone ?: "")
            .apply()
        ApiClient.authToken = token
    }

    fun clear() {
        prefs.edit().clear().apply()
        ApiClient.authToken = null
    }

    fun token(): String?    = prefs.getString(KEY_TOKEN, null)
    fun appUserId(): String? = prefs.getString(KEY_USER_ID, null)
    fun email(): String?    = prefs.getString(KEY_EMAIL, null)
    fun fullName(): String? = prefs.getString(KEY_FULL_NAME, null)
    fun phone(): String?    = prefs.getString(KEY_PHONE, null)

    fun user(): AppUser? {
        val id = appUserId() ?: return null
        return AppUser(
            appUserId = id,
            email     = email().orEmpty(),
            fullName  = fullName().orEmpty(),
            phone     = phone().takeUnless { it.isNullOrBlank() },
        )
    }

    fun isLoggedIn(): Boolean = !token().isNullOrEmpty()

    /** Re-attach the persisted token to ApiClient after a process restart. */
    fun rehydrate() { ApiClient.authToken = token() }

    companion object {
        private const val PREFS         = "mfc_prefs"
        private const val KEY_TOKEN     = "auth_token"
        private const val KEY_USER_ID   = "app_user_id"
        private const val KEY_EMAIL     = "email"
        private const val KEY_FULL_NAME = "full_name"
        private const val KEY_PHONE     = "phone"
    }
}
