package com.example.evcharge

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import com.example.evcharge.data.AppUser
import com.example.evcharge.data.ChargingStation
import com.example.evcharge.data.StationRepository
import com.example.evcharge.data.TokenStore
import com.example.evcharge.network.WebSocketManager
import com.example.evcharge.notifications.EvChargeMessagingService
import com.example.evcharge.ui.screens.LoginScreen
import com.example.evcharge.ui.screens.MapScreen
import com.example.evcharge.ui.screens.NavigationScreen
import com.example.evcharge.ui.screens.NotificationsScreen
import com.example.evcharge.ui.screens.ReportProblemSheet
import com.example.evcharge.ui.screens.SplashScreen
import com.example.evcharge.ui.theme.EVChargeTheme

private sealed class Screen {
    data object Splash        : Screen()
    data object Map           : Screen()
    data object Notifications : Screen()
    data class Navigate(val station: ChargingStation, val paymentMethod: String) : Screen()
}

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Re-attach the persisted JWT before any network call fires.
        TokenStore(this).rehydrate()
        // Real-time station status updates.
        WebSocketManager.connect()

        setContent {
            EVChargeTheme {
                EVChargeApp()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        WebSocketManager.disconnect()
    }
}

@Composable
fun EVChargeApp() {
    val context    = LocalContext.current
    val tokenStore = remember { TokenStore(context) }

    var currentScreen by remember { mutableStateOf<Screen>(Screen.Splash) }
    var currentUser   by remember {
        mutableStateOf<AppUser?>(if (tokenStore.isLoggedIn()) tokenStore.user() else null)
    }
    var unreadCount by remember {
        mutableIntStateOf(EvChargeMessagingService.unreadCount(context))
    }

    var stations by remember { mutableStateOf<List<ChargingStation>>(emptyList()) }
    val repository = remember { StationRepository() }

    LaunchedEffect(Unit) {
        repository.getStations()
            .onSuccess { stations = it }
            .onFailure { err ->
                Toast.makeText(context, "Stations error: ${err.message}", Toast.LENGTH_LONG).show()
            }
    }

    LaunchedEffect(Unit) {
        WebSocketManager.statusUpdates.collect { update ->
            stations = stations.map { station ->
                if (station.id == update.stationId)
                    station.copy(available = update.newStatus == "available", status = update.newStatus)
                else station
            }
        }
    }

    when (val screen = currentScreen) {

        is Screen.Splash -> SplashScreen(onFinished = { currentScreen = Screen.Map })

        is Screen.Map -> {
            var showLogin     by remember { mutableStateOf(false) }
            var reportStation by remember { mutableStateOf<ChargingStation?>(null) }

            MapScreen(
                stations            = stations,
                isLoggedIn          = currentUser != null,
                unreadNotifCount    = unreadCount,
                onNavigateToStation = { station, method -> currentScreen = Screen.Navigate(station, method) },
                onReportStation     = { reportStation = it },
                onOpenLogin         = { showLogin = true },
                onOpenNotifications = {
                    unreadCount = 0
                    currentScreen = Screen.Notifications
                },
                onLogout = {
                    tokenStore.clear()
                    currentUser = null
                },
            )

            if (showLogin) {
                LoginScreen(
                    onClose        = { showLogin = false },
                    onLoginSuccess = { user -> currentUser = user; showLogin = false },
                )
            }

            reportStation?.let { station ->
                ReportProblemSheet(
                    station     = station,
                    onClose     = { reportStation = null },
                    onSubmitted = { reportStation = null },
                )
            }
        }

        is Screen.Notifications -> NotificationsScreen(
            onBack = {
                unreadCount = EvChargeMessagingService.unreadCount(context)
                currentScreen = Screen.Map
            },
        )

        is Screen.Navigate -> NavigationScreen(
            station       = screen.station,
            paymentMethod = screen.paymentMethod,
            onBack        = { currentScreen = Screen.Map },
        )
    }
}
