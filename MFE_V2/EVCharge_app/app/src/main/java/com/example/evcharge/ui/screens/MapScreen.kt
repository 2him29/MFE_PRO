package com.example.evcharge.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color as AndroidColor
import android.graphics.Paint
import android.graphics.drawable.Drawable
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.example.evcharge.data.ChargingStation
import com.example.evcharge.data.RouteRepository
import com.example.evcharge.ui.theme.Blue600
import kotlin.math.roundToInt
import org.osmdroid.views.overlay.Polyline
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.mylocation.GpsMyLocationProvider
import org.osmdroid.views.overlay.mylocation.MyLocationNewOverlay

private val ALGIERS_CENTER = GeoPoint(36.7538, 3.0588)
private const val DEFAULT_ZOOM = 14.0

@Composable
fun MapScreen(
    stations: List<ChargingStation>,
    isLoggedIn: Boolean,
    unreadNotifCount: Int = 0,
    onNavigateToStation: (ChargingStation, String) -> Unit,
    onReportStation: (ChargingStation) -> Unit,
    onOpenLogin: () -> Unit,
    onOpenNotifications: () -> Unit = {},
    onLogout: () -> Unit,
) {
    val context = LocalContext.current
    var selectedStation by remember { mutableStateOf<ChargingStation?>(null) }
    var mapView by remember { mutableStateOf<MapView?>(null) }
    var showLoginPrompt by remember { mutableStateOf(false) }
    var paymentStationPending by remember { mutableStateOf<ChargingStation?>(null) }
    var locationOverlayRef by remember { mutableStateOf<MyLocationNewOverlay?>(null) }
    var routePoints by remember { mutableStateOf<List<GeoPoint>?>(null) }
    var routeInfo   by remember { mutableStateOf<Pair<Double, Double>?>(null) }

    LaunchedEffect(selectedStation) {
        routePoints = null
        routeInfo   = null
        val station = selectedStation ?: return@LaunchedEffect
        val loc = locationOverlayRef?.myLocation ?: return@LaunchedEffect
        val origin = GeoPoint(loc.latitude, loc.longitude)
        val dest   = GeoPoint(station.latitude, station.longitude)
        RouteRepository.getRoute(origin, dest).onSuccess { route ->
            routePoints = route.points
            routeInfo   = Pair(route.totalDistanceM, route.totalDurationS)
        }
    }

    var searchQuery by remember { mutableStateOf("") }
    var isSearchActive by remember { mutableStateOf(false) }
    val searchResults = remember(searchQuery, stations) {
        if (searchQuery.isBlank()) emptyList()
        else stations.filter {
            it.name.contains(searchQuery, ignoreCase = true) ||
            it.address.contains(searchQuery, ignoreCase = true)
        }.take(6)
    }

    BackHandler(enabled = isSearchActive) {
        isSearchActive = false
        searchQuery = ""
    }

    var hasLocationPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> hasLocationPermission = granted }

    LaunchedEffect(Unit) {
        Configuration.getInstance().userAgentValue = context.packageName
        if (!hasLocationPermission) {
            permissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                MapView(ctx).apply {
                    setTileSource(TileSourceFactory.MAPNIK)
                    setMultiTouchControls(true)
                    isTilesScaledToDpi = true
                    // setZoom must run after the view is laid out, otherwise OSMDroid ignores it.
                    post {
                        controller.setZoom(DEFAULT_ZOOM)
                        controller.setCenter(ALGIERS_CENTER)
                    }

                    if (hasLocationPermission) {
                        val loc = MyLocationNewOverlay(GpsMyLocationProvider(ctx), this)
                        loc.enableMyLocation()
                        overlays.add(loc)
                        locationOverlayRef = loc
                    }
                    mapView = this
                }
            },
            update = { view ->
                if (hasLocationPermission && view.overlays.none { it is MyLocationNewOverlay }) {
                    val loc = MyLocationNewOverlay(GpsMyLocationProvider(view.context), view)
                    loc.enableMyLocation()
                    view.overlays.add(0, loc)
                    locationOverlayRef = loc
                }
                // Draw or clear route preview polyline.
                view.overlays.removeAll { it is Polyline }
                routePoints?.let { pts ->
                    val line = Polyline(view).apply {
                        setPoints(pts)
                        outlinePaint.color       = android.graphics.Color.parseColor("#2563EB")
                        outlinePaint.strokeWidth = 12f
                        outlinePaint.alpha       = 180
                    }
                    view.overlays.add(0, line)
                }
                // Rebuild station markers so live status updates (from WebSocket) are reflected.
                view.overlays.removeAll { it is Marker }
                stations.forEach { station ->
                    val marker = Marker(view).apply {
                        position = GeoPoint(station.latitude, station.longitude)
                        title    = station.name
                        icon = buildPinDrawable(station.status)
                        setAnchor(Marker.ANCHOR_CENTER, 0.9f)
                        setOnMarkerClickListener { _, _ ->
                            selectedStation = station
                            true
                        }
                    }
                    view.overlays.add(marker)
                }
                view.invalidate()
            },
            modifier = Modifier.fillMaxSize(),
        )

        TopSearchBar(
            isLoggedIn          = isLoggedIn,
            unreadNotifCount    = unreadNotifCount,
            onOpenLogin         = onOpenLogin,
            onOpenNotifications = onOpenNotifications,
            onLogout            = onLogout,
            searchQuery         = searchQuery,
            isSearchActive      = isSearchActive,
            onQueryChange       = { searchQuery = it },
            onSearchToggle      = { isSearchActive = it },
            searchResults       = searchResults,
            onStationSelected = { station ->
                isSearchActive = false
                searchQuery    = ""
                selectedStation = station
                mapView?.controller?.animateTo(GeoPoint(station.latitude, station.longitude))
                mapView?.controller?.setZoom(15.0)
            },
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 48.dp, start = 16.dp, end = 16.dp),
        )

        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 16.dp, bottom = if (selectedStation != null) 320.dp else 100.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            MapFab(Icons.Filled.Add,        "Zoom in")            { mapView?.controller?.zoomIn() }
            MapFab(Icons.Filled.Remove,     "Zoom out")           { mapView?.controller?.zoomOut() }
            MapFab(Icons.Filled.MyLocation, "Centre on Algiers")  {
                mapView?.controller?.animateTo(ALGIERS_CENTER)
                mapView?.controller?.setZoom(DEFAULT_ZOOM)
            }
        }

        AnimatedVisibility(
            visible = selectedStation != null,
            enter = slideInVertically { it },
            exit  = slideOutVertically { it },
            modifier = Modifier.align(Alignment.BottomCenter),
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                routeInfo?.let { (distM, durS) ->
                    Surface(
                        modifier = Modifier
                            .align(Alignment.CenterHorizontally)
                            .padding(bottom = 8.dp)
                            .shadow(6.dp, RoundedCornerShape(20.dp)),
                        shape = RoundedCornerShape(20.dp),
                        color = Color(0xFF1D4ED8),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Filled.Navigation,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(14.dp),
                            )
                            Text(
                                "${fmtDist(distM)} · ${(durS / 60).roundToInt()} min drive",
                                color = Color.White,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
                selectedStation?.let { station ->
                    StationCard(
                        station    = station,
                        onClose    = { selectedStation = null },
                        onNavigate = {
                            if (isLoggedIn) {
                                selectedStation = null
                                paymentStationPending = station
                            } else {
                                showLoginPrompt = true
                            }
                        },
                        onReport = {
                            if (isLoggedIn) {
                                selectedStation = null
                                onReportStation(station)
                            } else {
                                showLoginPrompt = true
                            }
                        },
                    )
                }
            }
        }

        if (showLoginPrompt) {
            AlertDialog(
                onDismissRequest = { showLoginPrompt = false },
                title = { Text("Login Required") },
                text = { Text("Please log in to navigate or report a problem.") },
                confirmButton = {
                    Button(
                        onClick = { showLoginPrompt = false; onOpenLogin() },
                        colors = ButtonDefaults.buttonColors(containerColor = Blue600),
                    ) { Text("Log in") }
                },
                dismissButton = {
                    TextButton(onClick = { showLoginPrompt = false }) { Text("Cancel") }
                },
            )
        }

        paymentStationPending?.let { station ->
            PaymentMethodSheet(
                onDismiss = { paymentStationPending = null },
                onSelect  = { method ->
                    paymentStationPending = null
                    onNavigateToStation(station, method)
                },
            )
        }
    }
}

private fun fmtDist(m: Double): String =
    if (m < 1_000) "${m.toInt()} m" else "${"%.1f".format(m / 1_000)} km"

// Builds a pin bitmap then wraps it in a Drawable whose setColorFilter / setAlpha
// are no-ops, so OSMDroid cannot tint or dim the pre-baked colors.
// available → green ⚡  charging → blue ⚡  fault → red ✕
// maintenance → orange 🔧  offline/else → grey ✕
private fun buildPinDrawable(status: String): Drawable {
    val fillColor = when (status) {
        "available"   -> AndroidColor.parseColor("#16A34A")
        "charging"    -> AndroidColor.parseColor("#2563EB")
        "fault"       -> AndroidColor.parseColor("#DC2626")
        "maintenance" -> AndroidColor.parseColor("#FB923C")
        else          -> AndroidColor.parseColor("#94A3B8")
    }
    val icon = when (status) {
        "available", "charging" -> "⚡"
        "maintenance"           -> "🔧"
        else                    -> null
    }

    val W = 96
    val H = 112
    val bitmap = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)

    val w  = W.toFloat()
    val h  = H.toFloat()
    val r  = w * 0.38f
    val cx = w / 2f
    val cy = h * 0.40f

    canvas.drawCircle(cx + 2f, cy + 2f, r,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = AndroidColor.parseColor("#33000000") })

    val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = fillColor }
    canvas.drawCircle(cx, cy, r, fillPaint)
    canvas.drawCircle(cx, cy, r - 3f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = AndroidColor.WHITE; style = Paint.Style.STROKE; strokeWidth = 5f
        })

    val path = android.graphics.Path().apply {
        moveTo(cx - 10f, cy + r - 4f)
        lineTo(cx, h * 0.92f)
        lineTo(cx + 10f, cy + r - 4f)
        close()
    }
    canvas.drawPath(path, fillPaint)

    if (icon != null) {
        canvas.drawText(icon, cx, cy + 10f,
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = AndroidColor.WHITE; textSize = 30f
                textAlign = Paint.Align.CENTER; isFakeBoldText = true
            })
    } else {
        val d = r * 0.38f
        canvas.drawLine(cx - d, cy - d, cx + d, cy + d,
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = AndroidColor.WHITE; strokeWidth = 5f
                strokeCap = Paint.Cap.ROUND; style = Paint.Style.STROKE
            })
        canvas.drawLine(cx + d, cy - d, cx - d, cy + d,
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = AndroidColor.WHITE; strokeWidth = 5f
                strokeCap = Paint.Cap.ROUND; style = Paint.Style.STROKE
            })
    }

    // Immutable wrapper — OSMDroid calls setColorFilter/setAlpha on icons;
    // intercepting them here ensures the baked bitmap color is never overridden.
    return object : Drawable() {
        override fun draw(c: Canvas) {
            c.drawBitmap(bitmap, bounds.left.toFloat(), bounds.top.toFloat(), null)
        }
        override fun setAlpha(alpha: Int) {}
        override fun setColorFilter(cf: android.graphics.ColorFilter?) {}
        @Deprecated("Deprecated in Java")
        override fun getOpacity() = android.graphics.PixelFormat.TRANSLUCENT
        override fun getIntrinsicWidth()  = W
        override fun getIntrinsicHeight() = H
    }
}

@Composable
private fun TopSearchBar(
    isLoggedIn: Boolean,
    unreadNotifCount: Int = 0,
    onOpenLogin: () -> Unit,
    onOpenNotifications: () -> Unit = {},
    onLogout: () -> Unit,
    searchQuery: String,
    isSearchActive: Boolean,
    onQueryChange: (String) -> Unit,
    onSearchToggle: (Boolean) -> Unit,
    searchResults: List<ChargingStation>,
    onStationSelected: (ChargingStation) -> Unit,
    modifier: Modifier = Modifier,
) {
    var showMenu by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(isSearchActive) {
        if (isSearchActive) focusRequester.requestFocus()
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
                    .shadow(4.dp, RoundedCornerShape(12.dp)),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surface,
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        if (isSearchActive) Icons.Filled.ArrowBack else Icons.Filled.Search,
                        contentDescription = if (isSearchActive) "Close search" else "Search",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier
                            .size(20.dp)
                            .clickable(enabled = isSearchActive) {
                                onSearchToggle(false)
                                onQueryChange("")
                            },
                    )

                    if (isSearchActive) {
                        BasicTextField(
                            value = searchQuery,
                            onValueChange = onQueryChange,
                            singleLine = true,
                            textStyle = TextStyle(
                                color = MaterialTheme.colorScheme.onSurface,
                                fontSize = 14.sp,
                            ),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                            modifier = Modifier
                                .weight(1f)
                                .focusRequester(focusRequester),
                            decorationBox = { inner ->
                                if (searchQuery.isEmpty()) {
                                    Text(
                                        "Search charging stations…",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        fontSize = 14.sp,
                                    )
                                }
                                inner()
                            },
                        )
                        if (searchQuery.isNotEmpty()) {
                            Icon(
                                Icons.Filled.Close,
                                contentDescription = "Clear",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(18.dp).clickable { onQueryChange("") },
                            )
                        }
                    } else {
                        Text(
                            "Search charging stations…",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 14.sp,
                            modifier = Modifier
                                .weight(1f)
                                .clickable { onSearchToggle(true) },
                        )
                    }
                }
            }

            if (!isSearchActive) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {

                    // Bell button with unread badge
                    Box {
                        Surface(
                            onClick  = onOpenNotifications,
                            modifier = Modifier.size(48.dp).shadow(4.dp, CircleShape),
                            shape    = CircleShape,
                            color    = MaterialTheme.colorScheme.surface,
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Filled.Notifications,
                                    contentDescription = "Notifications",
                                    tint     = Blue600,
                                    modifier = Modifier.size(22.dp),
                                )
                            }
                        }
                        if (unreadNotifCount > 0) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .offset(x = 2.dp, y = (-2).dp)
                                    .size(18.dp)
                                    .background(Color(0xFFEF4444), CircleShape),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    if (unreadNotifCount > 9) "9+" else unreadNotifCount.toString(),
                                    fontSize    = 9.sp,
                                    fontWeight  = FontWeight.Bold,
                                    color       = Color.White,
                                )
                            }
                        }
                    }

                    // User / Login button
                    Box {
                        Surface(
                            onClick = { if (isLoggedIn) showMenu = true else onOpenLogin() },
                            modifier = Modifier.size(48.dp).shadow(4.dp, CircleShape),
                            shape = CircleShape,
                            color = if (isLoggedIn) Color(0xFF22C55E) else Blue600,
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Filled.Person,
                                    contentDescription = "User",
                                    tint = Color.White,
                                    modifier = Modifier.size(22.dp),
                                )
                            }
                        }
                        DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                            DropdownMenuItem(
                                text = { Text("Sign Out") },
                                onClick = { showMenu = false; onLogout() },
                                leadingIcon = { Icon(Icons.Filled.ExitToApp, contentDescription = null) },
                            )
                        }
                    }
                }
            }
        }

        // Results dropdown
        if (isSearchActive && searchResults.isNotEmpty()) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 6.dp)
                    .shadow(8.dp, RoundedCornerShape(12.dp)),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surface,
            ) {
                LazyColumn(modifier = Modifier.heightIn(max = 320.dp)) {
                    items(searchResults) { station ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onStationSelected(station) }
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .background(
                                        color = when (station.status) {
                                            "available"   -> Color(0xFF16A34A)
                                            "charging"    -> Color(0xFF2563EB)
                                            "fault"       -> Color(0xFFDC2626)
                                            "maintenance" -> Color(0xFFFB923C)
                                            else          -> Color(0xFF94A3B8)
                                        },
                                        shape = CircleShape,
                                    )
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    station.name,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.onSurface,
                                )
                                Text(
                                    station.address,
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                )
                            }
                            Text(
                                station.status,
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        if (station != searchResults.last()) {
                            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MapFab(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    description: String,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.size(44.dp).shadow(4.dp, RoundedCornerShape(10.dp)),
        shape = RoundedCornerShape(10.dp),
        color = MaterialTheme.colorScheme.surface,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                icon,
                contentDescription = description,
                tint = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PaymentMethodSheet(
    onDismiss: () -> Unit,
    onSelect: (String) -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
        ) {
            Text(
                "Choose Payment Method",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "You will be charged after your charging session ends.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(20.dp))

            PaymentOption(
                icon     = Icons.Filled.CreditCard,
                title    = "CIB Card",
                subtitle = "Algerian bank card",
                onClick  = { onSelect("cib") },
            )
            Spacer(Modifier.height(10.dp))
            PaymentOption(
                icon     = Icons.Filled.PhoneAndroid,
                title    = "BaridiMob",
                subtitle = "Mobile e-payment",
                onClick  = { onSelect("epayment") },
            )
            Spacer(Modifier.height(10.dp))
            PaymentOption(
                icon     = Icons.Filled.Nfc,
                title    = "RFID Card",
                subtitle = "Contactless charging badge",
                onClick  = { onSelect("rfid_card") },
            )

            Spacer(modifier = Modifier.windowInsetsBottomHeight(WindowInsets.navigationBars))
        }
    }
}

@Composable
private fun PaymentOption(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(Blue600.copy(alpha = 0.12f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = Blue600, modifier = Modifier.size(22.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
                Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(
                Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}
