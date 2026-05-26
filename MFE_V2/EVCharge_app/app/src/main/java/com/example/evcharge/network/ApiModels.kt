package com.example.evcharge.network

import com.example.evcharge.data.ChargingStation
import com.google.gson.annotations.SerializedName

// ── Auth ─────────────────────────────────────────────────────────────────────

data class RegisterRequest(
    val email: String,
    val password: String,
    val full_name: String,
    val phone: String? = null,
)

data class LoginRequest(
    val email: String,
    val password: String,
)

data class AuthResponse(
    val token: String,
    val user: AppUserResponse,
)

data class AppUserResponse(
    @SerializedName("appUserId") val appUserId: String,
    val email: String,
    val full_name: String,
    val phone: String?,
)

// ── Stations ─────────────────────────────────────────────────────────────────

data class ApiStation(
    val id: String,
    val name: String,
    val address: String,
    val city: String,
    @SerializedName("lat") val latitude: Double,
    @SerializedName("lng") val longitude: Double,
    val status: String,
    @SerializedName("max_power_kw") val maxPowerKw: Double?,
    // `price` is the pre-formatted column from vw_app_station_map (e.g. "5.0 DZD/kWh")
    @SerializedName("price") val priceStr: String?,
    @SerializedName("connector_types") val connectorTypes: String?,
    @SerializedName("available_connectors") val availableConnectors: Int?,
    @SerializedName("total_connectors") val totalConnectors: Int?,
    @SerializedName("charging_time_estimate") val chargingTimeEstimate: String?,
) {
    val isAvailable: Boolean get() = status == "available"

    fun toChargingStation() = ChargingStation(
        id                  = id,
        name                = name,
        address             = "$address, $city",
        latitude            = latitude,
        longitude           = longitude,
        available           = isAvailable,
        status              = status,
        power               = if ((maxPowerKw ?: 0.0) > 0) "${maxPowerKw!!.toInt()} kW" else "N/A",
        distance            = "",
        price               = priceStr?.takeIf { it.isNotBlank() } ?: "N/A",
        chargingTime        = chargingTimeEstimate ?: "~30 min",
        connectorTypes      = connectorTypes?.takeIf { it.isNotBlank() } ?: "",
        availableConnectors = availableConnectors ?: 0,
        totalConnectors     = totalConnectors ?: 0,
    )
}

// ── Sessions ─────────────────────────────────────────────────────────────────

data class ApiSession(
    val session_id: String,
    val station_name: String,
    val connector_type: String,
    val start_time: String,
    val end_time: String?,
    val duration_min: Int?,
    val energy_kwh: Double?,
    val cost_dzd: Double?,
    val status: String,
)

data class StartSessionRequest(
    val station_id: String,
    val payment_method: String,
)

data class StartSessionResponse(
    val session_id: String,
    val station_id: String,
    val connector_id: String,
    val payment_method: String,
    val estimated_cost_dzd: Double,
    val status: String,
)

data class StopSessionRequest(val action: String = "stop")

data class StopSessionResponse(
    val session_id: String,
    val duration_min: Int,
    val energy_kwh: Double,
    val cost_dzd: Double,
    val status: String,
)

// ── Tickets (Report a Problem) ───────────────────────────────────────────────

data class CreateTicketRequest(
    val station_id: String,
    val category: String,           // power_failure | screen_issue | charger_fault | system_failure | network_issue | maintenance
    val description: String? = null,
)

data class CreateTicketResponse(
    val ticket_id: String,
    val station_id: String,
    val category: String,
    val status: String,
)

// ── FCM Token ────────────────────────────────────────────────────────────────

data class FcmTokenRequest(val fcm_token: String)

data class GenericResponse(
    val success: Boolean?,
    val error: String?,
)
