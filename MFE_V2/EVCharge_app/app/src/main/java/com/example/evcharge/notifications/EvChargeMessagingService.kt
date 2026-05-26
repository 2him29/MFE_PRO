package com.example.evcharge.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.example.evcharge.MainActivity
import com.example.evcharge.network.ApiClient
import com.example.evcharge.network.ApiService
import com.example.evcharge.network.FcmTokenRequest
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class EvChargeMessagingService : FirebaseMessagingService() {

    companion object {
        const val CHANNEL_STATIONS    = "station_updates"
        const val CHANNEL_TARIFFS     = "tariff_updates"
        const val CHANNEL_BROADCASTS  = "announcements"

        private const val PREFS_NAME   = "ev_notifications"
        private const val PREFS_KEY    = "notif_list"
        private const val MAX_STORED   = 50

        /** Save a notification to local history. */
        fun storeNotification(context: Context, title: String, body: String, type: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val arr   = runCatching { JSONArray(prefs.getString(PREFS_KEY, "[]")) }
                            .getOrDefault(JSONArray())

            val obj = JSONObject().apply {
                put("title", title)
                put("body",  body)
                put("type",  type)
                put("time",  SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).format(Date()))
                put("read",  false)
            }

            // Prepend so newest is first; cap at MAX_STORED
            val newArr = JSONArray()
            newArr.put(obj)
            for (i in 0 until minOf(arr.length(), MAX_STORED - 1)) newArr.put(arr.get(i))

            prefs.edit().putString(PREFS_KEY, newArr.toString()).apply()
        }

        /** Return all stored notifications as a list of maps. */
        fun getNotifications(context: Context): List<Map<String, String>> {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val arr   = runCatching { JSONArray(prefs.getString(PREFS_KEY, "[]")) }
                            .getOrDefault(JSONArray())
            return (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                mapOf(
                    "title" to o.optString("title"),
                    "body"  to o.optString("body"),
                    "type"  to o.optString("type"),
                    "time"  to o.optString("time"),
                    "read"  to o.optString("read", "false"),
                )
            }
        }

        /** Count unread notifications. */
        fun unreadCount(context: Context): Int {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val arr   = runCatching { JSONArray(prefs.getString(PREFS_KEY, "[]")) }
                            .getOrDefault(JSONArray())
            return (0 until arr.length()).count { i -> !arr.getJSONObject(i).optBoolean("read") }
        }

        /** Mark all notifications as read. */
        fun markAllRead(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val arr   = runCatching { JSONArray(prefs.getString(PREFS_KEY, "[]")) }
                            .getOrDefault(JSONArray())
            for (i in 0 until arr.length()) arr.getJSONObject(i).put("read", true)
            prefs.edit().putString(PREFS_KEY, arr.toString()).apply()
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val title  = remoteMessage.notification?.title ?: remoteMessage.data["title"] ?: "EV Charge"
        val body   = remoteMessage.notification?.body  ?: remoteMessage.data["body"]  ?: ""
        val type   = remoteMessage.data["type"] ?: "broadcast"
        val status = remoteMessage.data["status"] ?: ""

        storeNotification(this, title, body, type)
        showNotification(title, body, type, status)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        sendTokenToServer(token)
    }

    private fun sendTokenToServer(token: String) {
        val prefs     = getSharedPreferences("mfc_prefs", Context.MODE_PRIVATE)
        val authToken = prefs.getString("auth_token", null) ?: return
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val api = ApiClient.authenticatedRetrofit().create(ApiService::class.java)
                api.registerFcmToken("Bearer $authToken", FcmTokenRequest(fcm_token = token))
            } catch (e: Exception) {
                android.util.Log.e("FCM", "Failed to send token: ${e.message}")
            }
        }
    }

    private fun createChannels(manager: NotificationManager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        listOf(
            Triple(CHANNEL_STATIONS,   "Station Updates",  NotificationManager.IMPORTANCE_HIGH),
            Triple(CHANNEL_TARIFFS,    "Tariff Updates",   NotificationManager.IMPORTANCE_DEFAULT),
            Triple(CHANNEL_BROADCASTS, "Announcements",    NotificationManager.IMPORTANCE_DEFAULT),
        ).forEach { (id, name, importance) ->
            if (manager.getNotificationChannel(id) == null)
                manager.createNotificationChannel(NotificationChannel(id, name, importance))
        }
    }

    private fun showNotification(title: String, body: String, type: String, status: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createChannels(manager)

        val channel = when (type) {
            "tariff_change"                      -> CHANNEL_TARIFFS
            "broadcast", "new_station"           -> CHANNEL_BROADCASTS
            else                                 -> CHANNEL_STATIONS
        }

        val iconRes = when (type) {
            "station_available"   -> android.R.drawable.presence_online
            "station_maintenance" -> android.R.drawable.ic_dialog_alert
            "tariff_change"       -> android.R.drawable.ic_dialog_info
            "new_station"         -> android.R.drawable.ic_menu_add
            else                  -> when (status) {
                "available" -> android.R.drawable.presence_online
                "offline"   -> android.R.drawable.presence_offline
                else        -> android.R.drawable.ic_dialog_info
            }
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("open_notifications", true)
            putExtra("type", type)
        }
        val pending = PendingIntent.getActivity(
            this, System.currentTimeMillis().toInt(), intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, channel)
            .setSmallIcon(iconRes)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pending)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        manager.notify((System.currentTimeMillis() % Int.MAX_VALUE).toInt(), notification)
    }
}
