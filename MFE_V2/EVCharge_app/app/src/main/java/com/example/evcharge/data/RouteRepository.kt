package com.example.evcharge.data

import android.util.Log
import com.example.evcharge.network.ServerConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.osmdroid.util.GeoPoint
import java.net.HttpURLConnection
import java.net.URL

// ── Data classes returned to the UI ─────────────────────────────────────────

data class RouteResult(
    val points         : List<GeoPoint>,
    val steps          : List<NavStep>,
    val totalDistanceM : Double,
    val totalDurationS : Double,
)

data class NavStep(
    val instruction  : String,
    val distanceM    : Double,
    val durationS    : Double,
    /** ORS maneuver type: 0=depart 1=left 2=right 5=sl-left 6=sl-right 7=u-turn 10=arrive */
    val type         : Int,
    val waypointIndex: Int,
)

// ── Repository ──────────────────────────────────────────────────────────────

object RouteRepository {

    private val BASE = "http://${ServerConfig.HOST}:${ServerConfig.PORT}/api/app/route"

    suspend fun getRoute(from: GeoPoint, to: GeoPoint): Result<RouteResult> =
        withContext(Dispatchers.IO) {
            try {
                val url = "$BASE?startLng=${from.longitude}&startLat=${from.latitude}" +
                          "&endLng=${to.longitude}&endLat=${to.latitude}"
                val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 15_000
                    readTimeout    = 15_000
                }
                val code = conn.responseCode
                if (code != 200) {
                    val err = conn.errorStream?.bufferedReader()?.readText() ?: ""
                    conn.disconnect()
                    return@withContext Result.failure(Exception("Route error $code: $err"))
                }
                val body = conn.inputStream.bufferedReader().readText()
                conn.disconnect()
                Result.success(parseGeoJson(body))
            } catch (e: Exception) {
                Log.e("RouteRepository", "getRoute failed", e)
                Result.failure(e)
            }
        }

    private fun parseGeoJson(json: String): RouteResult {
        val root    = JSONObject(json)
        val feat    = root.getJSONArray("features").getJSONObject(0)
        val coords  = feat.getJSONObject("geometry").getJSONArray("coordinates")
        val props   = feat.getJSONObject("properties")
        val summary = props.getJSONObject("summary")

        val points = (0 until coords.length()).map { i ->
            val p = coords.getJSONArray(i)
            GeoPoint(p.getDouble(1), p.getDouble(0))
        }

        val steps    = mutableListOf<NavStep>()
        val segments = props.getJSONArray("segments")
        for (si in 0 until segments.length()) {
            val ss = segments.getJSONObject(si).getJSONArray("steps")
            for (ki in 0 until ss.length()) {
                val s = ss.getJSONObject(ki)
                steps += NavStep(
                    instruction   = s.getString("instruction"),
                    distanceM     = s.getDouble("distance"),
                    durationS     = s.getDouble("duration"),
                    type          = s.getInt("type"),
                    waypointIndex = s.getJSONArray("way_points").getInt(0),
                )
            }
        }

        return RouteResult(
            points         = points,
            steps          = steps,
            totalDistanceM = summary.getDouble("distance"),
            totalDurationS = summary.getDouble("duration"),
        )
    }
}
