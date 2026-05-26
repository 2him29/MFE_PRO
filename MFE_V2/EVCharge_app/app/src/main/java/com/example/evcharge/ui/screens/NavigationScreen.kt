package com.example.evcharge.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.evcharge.data.ChargingStation
import com.example.evcharge.data.SessionRepository
import com.example.evcharge.ui.theme.Blue600
import com.example.evcharge.ui.theme.Green500
import com.example.evcharge.ui.theme.Red500
import kotlinx.coroutines.launch
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline
import org.osmdroid.views.overlay.mylocation.GpsMyLocationProvider
import org.osmdroid.views.overlay.mylocation.MyLocationNewOverlay

private fun turnIcon(type: Int) = when (type) {
    0    -> Icons.Filled.NearMe
    1    -> Icons.Filled.TurnLeft
    2    -> Icons.Filled.TurnRight
    5    -> Icons.Filled.TurnSlightLeft
    6    -> Icons.Filled.TurnSlightRight
    7    -> Icons.Filled.UTurnLeft
    10   -> Icons.Filled.Flag
    else -> Icons.Filled.Navigation
}

private fun fmtDist(m: Double): String =
    if (m < 1_000) "${m.toInt()} m" else "${"%.1f".format(m / 1_000)} km"

private fun payLabel(method: String) = when (method) {
    "cib"       -> "CIB Card"
    "epayment"  -> "BaridiMob"
    "rfid_card" -> "RFID Card"
    else        -> method
}

@Composable
fun NavigationScreen(
    station       : ChargingStation,
    paymentMethod : String,
    onBack        : () -> Unit,
) {
    val context  = LocalContext.current
    val vm       : NavigationViewModel = viewModel()
    val uiState  by vm.uiState.collectAsState()
    var mapRef   by remember { mutableStateOf<MapView?>(null) }

    val sessionRepo  = remember { SessionRepository(context) }
    val sessionScope = rememberCoroutineScope()
    var sessionStarting by remember { mutableStateOf(false) }
    var sessionStarted  by remember { mutableStateOf(false) }
    var activeSessionId by remember { mutableStateOf<String?>(null) }
    var sessionStopping by remember { mutableStateOf(false) }

    var hasPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        )
    }
    val permLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasPermission = granted
        if (granted) vm.start(context, station)
    }

    LaunchedEffect(Unit) {
        if (hasPermission) vm.start(context, station)
        else permLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
    }
    DisposableEffect(Unit) { onDispose { vm.stop() } }

    Column(modifier = Modifier.fillMaxSize()) {

        // Header
        Box(modifier = Modifier.fillMaxWidth().background(Blue600)) {
            Column(modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 16.dp)) {
                TextButton(
                    onClick = { vm.stop(); onBack() },
                    colors  = ButtonDefaults.textButtonColors(contentColor = Color.White),
                ) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Exit Navigation", fontSize = 14.sp)
                }

                Spacer(Modifier.height(4.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    when (val s = uiState) {
                        is NavUiState.Active -> {
                            Column {
                                Text("${s.remainingMinutes} min", fontSize = 32.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                Text(fmtDist(s.remainingDistM) + " remaining", fontSize = 13.sp, color = Color.White.copy(alpha = 0.85f))
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(station.name, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color.White)
                                val pulse = rememberInfiniteTransition(label = "gpsDot")
                                val a by pulse.animateFloat(1f, 0.25f, infiniteRepeatable(tween(800), RepeatMode.Reverse), label = "dotAlpha")
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                                    modifier = Modifier.padding(top = 4.dp),
                                ) {
                                    Box(Modifier.size(7.dp).background(Green500.copy(alpha = a), CircleShape))
                                    Text("GPS Active", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
                                }
                            }
                        }
                        is NavUiState.Loading -> {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                                Text("Calculating route…", color = Color.White, fontSize = 15.sp)
                            }
                        }
                        else -> Text("Navigating to ${station.name}", color = Color.White, fontSize = 15.sp)
                    }
                }
            }
        }

        // Live map
        Box(modifier = Modifier.fillMaxWidth().height(260.dp)) {
            AndroidView(
                factory = { ctx ->
                    MapView(ctx).apply {
                        setTileSource(TileSourceFactory.MAPNIK)
                        setMultiTouchControls(true)
                        isTilesScaledToDpi = true
                        controller.setZoom(16.0)
                        controller.setCenter(GeoPoint(station.latitude, station.longitude))

                        if (hasPermission) {
                            val loc = MyLocationNewOverlay(GpsMyLocationProvider(ctx), this)
                            loc.enableMyLocation()
                            loc.enableFollowLocation()
                            overlays.add(loc)
                        }

                        overlays.add(Marker(this).apply {
                            position = GeoPoint(station.latitude, station.longitude)
                            title    = station.name
                            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                        })

                        mapRef = this
                    }
                },
                update = { mv ->
                    val active = uiState as? NavUiState.Active ?: return@AndroidView
                    mv.overlays.removeAll { it is Polyline }
                    val line = Polyline(mv).apply {
                        setPoints(active.route.points)
                        outlinePaint.color       = android.graphics.Color.parseColor("#2563EB")
                        outlinePaint.strokeWidth = 14f
                        outlinePaint.alpha       = 210
                    }
                    mv.overlays.add(0, line)
                    mv.controller.animateTo(active.userLocation)
                    mv.invalidate()
                },
                modifier = Modifier.fillMaxSize(),
            )

            Surface(
                onClick = {
                    val pos = (uiState as? NavUiState.Active)?.userLocation ?: return@Surface
                    mapRef?.controller?.animateTo(pos)
                },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(10.dp)
                    .size(44.dp)
                    .shadow(4.dp, RoundedCornerShape(10.dp)),
                shape = RoundedCornerShape(10.dp),
                color = MaterialTheme.colorScheme.surface,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.MyLocation, "Re-center", tint = Blue600, modifier = Modifier.size(20.dp))
                }
            }
        }

        // Body
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            when (val s = uiState) {

                is NavUiState.Loading -> {
                    Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                            CircularProgressIndicator(color = Blue600)
                            Text("Fetching driving route…", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                            Text("Using OpenRouteService (free)", color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f), fontSize = 12.sp)
                        }
                    }
                }

                is NavUiState.Error -> {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)),
                        shape  = RoundedCornerShape(12.dp),
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(Icons.Filled.ErrorOutline, null, tint = Red500, modifier = Modifier.size(24.dp))
                            Column {
                                Text("Route unavailable", fontWeight = FontWeight.Medium, color = Red500, fontSize = 14.sp)
                                Spacer(Modifier.height(4.dp))
                                Text(s.message, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }

                is NavUiState.NoGps -> {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)),
                        shape  = RoundedCornerShape(12.dp),
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(Icons.Filled.GpsOff, null, tint = Color(0xFFD97706), modifier = Modifier.size(24.dp))
                            Text("GPS unavailable. Please enable location services.", fontSize = 13.sp)
                        }
                    }
                }

                is NavUiState.Active -> {
                    if (s.arrived) {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF0FDF4)),
                            shape  = RoundedCornerShape(14.dp),
                            elevation = CardDefaults.cardElevation(2.dp),
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(Icons.Filled.EvStation, null, tint = Green500, modifier = Modifier.size(30.dp))
                                Column {
                                    Text("You've arrived!", fontWeight = FontWeight.Bold, color = Color(0xFF166534), fontSize = 16.sp)
                                    Text(station.name, fontSize = 13.sp, color = Color(0xFF15803D))
                                }
                            }
                        }
                    }

                    val step = s.route.steps.getOrNull(s.currentStepIndex)
                    if (step != null) {
                        Card(
                            shape     = RoundedCornerShape(16.dp),
                            colors    = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF)),
                            elevation = CardDefaults.cardElevation(6.dp),
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(14.dp),
                            ) {
                                Box(
                                    modifier = Modifier.size(50.dp).background(Blue600, RoundedCornerShape(12.dp)),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(turnIcon(step.type), null, tint = Color.White, modifier = Modifier.size(28.dp))
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(step.instruction, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                                    Spacer(Modifier.height(3.dp))
                                    Text(fmtDist(step.distanceM), fontSize = 12.sp, color = Blue600, fontWeight = FontWeight.Medium)
                                }
                            }
                        }
                    }

                    Text("Turn-by-turn directions", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)

                    s.route.steps.forEachIndexed { index, navStep ->
                        val isActive = index == s.currentStepIndex
                        val isPast   = index < s.currentStepIndex
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = when {
                                isActive -> Color(0xFFEFF6FF)
                                isPast   -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                                else     -> MaterialTheme.colorScheme.surface
                            },
                            border = if (isActive) BorderStroke(1.dp, SolidColor(Blue600)) else null,
                            tonalElevation = if (isActive) 0.dp else 1.dp,
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(34.dp)
                                        .background(
                                            when {
                                                isActive -> Blue600
                                                isPast   -> Green500
                                                else     -> MaterialTheme.colorScheme.surfaceVariant
                                            },
                                            CircleShape,
                                        ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    if (isPast) {
                                        Icon(Icons.Filled.Check, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    } else {
                                        Icon(
                                            turnIcon(navStep.type), null,
                                            tint = if (isActive) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.size(16.dp),
                                        )
                                    }
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        navStep.instruction,
                                        fontSize = 13.sp,
                                        color = if (isPast) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                                    )
                                    Text(fmtDist(navStep.distanceM), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }

                    Surface(
                        shape  = RoundedCornerShape(14.dp),
                        color  = Color(0xFFF0FDF4),
                        border = BorderStroke(1.dp, SolidColor(Color(0xFFBBF7D0))),
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                val pt = rememberInfiniteTransition(label = "payPulse")
                                val pa by pt.animateFloat(1f, 0.3f, infiniteRepeatable(tween(800), RepeatMode.Reverse), label = "payA")
                                Box(Modifier.size(8.dp).background(Green500.copy(alpha = pa), CircleShape))
                                Text("Payment method confirmed", fontSize = 13.sp, color = Color(0xFF166534))
                            }
                            Spacer(Modifier.height(4.dp))
                            Text("${payLabel(paymentMethod)} will be charged after charging", fontSize = 13.sp, color = Color(0xFF15803D))
                        }
                    }

                    Surface(
                        shape  = RoundedCornerShape(14.dp),
                        color  = MaterialTheme.colorScheme.surface,
                        border = BorderStroke(1.dp, SolidColor(MaterialTheme.colorScheme.outline)),
                        tonalElevation = 1.dp,
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Station Details", fontSize = 13.sp, fontWeight = FontWeight.Medium)
                            Spacer(Modifier.height(10.dp))
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Filled.LocationOn, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                                Text(station.address, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Spacer(Modifier.height(6.dp))
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Filled.Schedule, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                                Text("Charging time: ${station.chargingTime}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Spacer(Modifier.height(6.dp))
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Filled.Bolt, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                                Text("${station.power} · ${station.price}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }

                    Spacer(Modifier.height(8.dp))
                }
            }
        }

        // Bottom button
        Surface(
            modifier        = Modifier.fillMaxWidth(),
            shadowElevation = 8.dp,
            color           = MaterialTheme.colorScheme.surface,
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                val arrived = (uiState as? NavUiState.Active)?.arrived == true
                Button(
                    onClick = {
                        when {
                            sessionStopping -> { /* busy */ }
                            sessionStarted && activeSessionId != null -> {
                                sessionStopping = true
                                sessionScope.launch {
                                    sessionRepo.stopSession(activeSessionId!!)
                                        .onSuccess { result ->
                                            val msg = "Session complete · ${result.duration_min} min · ${result.energy_kwh} kWh · ${result.cost_dzd} DZD"
                                            Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
                                        }
                                        .onFailure {
                                            Toast.makeText(context, it.message ?: "Could not stop session", Toast.LENGTH_LONG).show()
                                        }
                                    sessionStopping = false
                                    vm.stop()
                                    onBack()
                                }
                            }
                            !arrived -> { vm.stop(); onBack() }
                            !sessionStarting -> {
                                sessionStarting = true
                                sessionScope.launch {
                                    sessionRepo.startSession(station.id, paymentMethod)
                                        .onSuccess { result ->
                                            activeSessionId = result.session_id
                                            sessionStarted  = true
                                            Toast.makeText(context, "Charging started — operator notified", Toast.LENGTH_LONG).show()
                                        }
                                        .onFailure {
                                            Toast.makeText(context, it.message ?: "Could not start session", Toast.LENGTH_LONG).show()
                                        }
                                    sessionStarting = false
                                }
                            }
                        }
                    },
                    enabled = !sessionStarting && !sessionStopping,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape    = RoundedCornerShape(14.dp),
                    colors   = ButtonDefaults.buttonColors(
                        containerColor = when {
                            sessionStarted -> Red500
                            arrived        -> Green500
                            else           -> Blue600
                        }
                    ),
                ) {
                    if (sessionStarting || sessionStopping) {
                        CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                    } else {
                        Icon(
                            if (sessionStarted) Icons.Filled.StopCircle else Icons.Filled.EvStation,
                            null,
                            modifier = Modifier.size(18.dp),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            when {
                                sessionStarted -> "Stop Charging"
                                arrived        -> "Start Charging ⚡"
                                else           -> "Cancel Navigation"
                            },
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
                Spacer(modifier = Modifier.windowInsetsBottomHeight(WindowInsets.navigationBars))
            }
        }
    }
}
