package com.example.evcharge.ui.screens

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.evcharge.data.ChargingStation
import com.example.evcharge.data.RouteRepository
import com.example.evcharge.data.RouteResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.osmdroid.util.GeoPoint
import kotlin.math.roundToInt

sealed class NavUiState {
    data object Loading : NavUiState()
    data object NoGps   : NavUiState()
    data class Error(val message: String) : NavUiState()
    data class Active(
        val route            : RouteResult,
        val userLocation     : GeoPoint,
        val currentStepIndex : Int,
        val remainingDistM   : Double,
        val remainingMinutes : Int,
        val arrived          : Boolean,
    ) : NavUiState()
}

class NavigationViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<NavUiState>(NavUiState.Loading)
    val uiState: StateFlow<NavUiState> = _uiState.asStateFlow()

    private var locationManager  : LocationManager?  = null
    private var locationListener : LocationListener? = null
    private var cachedRoute      : RouteResult?      = null
    private var stepIndex        : Int               = 0

    @SuppressLint("MissingPermission")
    fun start(context: Context, station: ChargingStation) {
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        locationManager = lm

        val providers = listOf(
            LocationManager.GPS_PROVIDER,
            LocationManager.NETWORK_PROVIDER,
            LocationManager.PASSIVE_PROVIDER,
        )
        val lastFix = providers
            .mapNotNull { try { lm.getLastKnownLocation(it) } catch (_: Exception) { null } }
            .filter { isValidAlgeriaNearbyFix(it) }
            .maxByOrNull { it.time }

        val origin = if (lastFix != null) GeoPoint(lastFix.latitude, lastFix.longitude)
                     else GeoPoint(36.7538, 3.0588) // Algiers centre fallback

        val destination = GeoPoint(station.latitude, station.longitude)

        viewModelScope.launch {
            _uiState.value = NavUiState.Loading
            RouteRepository.getRoute(origin, destination).fold(
                onSuccess = { route ->
                    cachedRoute = route
                    stepIndex   = 0
                    _uiState.value = NavUiState.Active(
                        route            = route,
                        userLocation     = origin,
                        currentStepIndex = 0,
                        remainingDistM   = route.totalDistanceM,
                        remainingMinutes = (route.totalDurationS / 60.0).roundToInt().coerceAtLeast(1),
                        arrived          = false,
                    )
                    startGps(lm)
                },
                onFailure = { _uiState.value = NavUiState.Error(it.message ?: "Unknown error") },
            )
        }
    }

    fun stop() {
        locationListener?.let { locationManager?.removeUpdates(it) }
        locationListener = null
    }

    override fun onCleared() {
        super.onCleared()
        stop()
    }

    @SuppressLint("MissingPermission")
    private fun startGps(lm: LocationManager) {
        locationListener = object : LocationListener {
            override fun onLocationChanged(loc: Location) = onNewFix(GeoPoint(loc.latitude, loc.longitude))
            @Deprecated("Deprecated in Java")
            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
        }
        val ok = tryRegister(lm, LocationManager.GPS_PROVIDER) ||
                 tryRegister(lm, LocationManager.NETWORK_PROVIDER)
        if (!ok) _uiState.value = NavUiState.NoGps
    }

    @SuppressLint("MissingPermission")
    private fun tryRegister(lm: LocationManager, provider: String): Boolean = try {
        if (lm.isProviderEnabled(provider)) {
            lm.requestLocationUpdates(provider, 2_000L, 5f, locationListener!!); true
        } else false
    } catch (_: Exception) { false }

    private fun isValidAlgeriaNearbyFix(fix: Location): Boolean {
        if (fix.latitude == 0.0 && fix.longitude == 0.0) return false
        if (fix.latitude  !in 15.0..43.0)  return false
        if (fix.longitude !in -10.0..25.0) return false
        return true
    }

    private fun onNewFix(pos: GeoPoint) {
        val route   = cachedRoute ?: return
        val current = _uiState.value as? NavUiState.Active ?: return

        var idx = stepIndex
        if (idx < route.steps.size - 1) {
            val nextWp = route.points.getOrNull(route.steps[idx + 1].waypointIndex)
            if (nextWp != null && pos.distanceToAsDouble(nextWp) < 35.0) {
                idx = (idx + 1).coerceAtMost(route.steps.size - 1)
                stepIndex = idx
            }
        }

        val dest    = route.points.last()
        val remain  = pos.distanceToAsDouble(dest)
        val arrived = remain < 50.0
        val etaMin  = ((remain / 1_000.0) / 30.0 * 60.0).roundToInt().coerceAtLeast(1)

        _uiState.value = current.copy(
            userLocation     = pos,
            currentStepIndex = idx,
            remainingDistM   = remain,
            remainingMinutes = etaMin,
            arrived          = arrived,
        )
    }
}
