package com.example.evcharge.network

import android.util.Log
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Connects to the Express WebSocket server.
 * Emits StationStatusUpdate whenever a station changes status server-side.
 */
object WebSocketManager {

    private const val TAG = "WebSocketManager"
    private val WS_URL = ServerConfig.WS_URL

    data class StationStatusUpdate(
        val stationId: String,
        val newStatus: String,
        val stationName: String,
    )

    private val _statusUpdates = MutableSharedFlow<StationStatusUpdate>(extraBufferCapacity = 10)
    val statusUpdates = _statusUpdates.asSharedFlow()

    private var webSocket: WebSocket? = null

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    fun connect() {
        val request = Request.Builder().url(WS_URL).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {

            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket connected")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val json = JSONObject(text)
                    if (json.optString("type") == "station_status_update") {
                        _statusUpdates.tryEmit(
                            StationStatusUpdate(
                                stationId   = json.getString("stationId"),
                                newStatus   = json.getString("status"),
                                stationName = json.optString("stationName", "Station"),
                            )
                        )
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to parse WS message: ${e.message}")
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket error: ${t.message}")
                // Auto-reconnect after 5 s
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({ connect() }, 5000)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closed: $reason")
            }
        })
    }

    fun disconnect() {
        webSocket?.close(1000, "App closed")
        webSocket = null
    }
}
