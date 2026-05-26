package com.example.evcharge.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.evcharge.notifications.EvChargeMessagingService
import com.example.evcharge.ui.theme.Blue600
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private data class NotifMeta(val icon: ImageVector, val tint: Color, val bg: Color, val label: String)

private fun metaFor(type: String) = when (type) {
    "station_available"   -> NotifMeta(Icons.Filled.EvStation,   Color(0xFF16A34A), Color(0xFFDCFCE7), "Available")
    "station_maintenance" -> NotifMeta(Icons.Filled.Build,        Color(0xFFEA580C), Color(0xFFFFF7ED), "Maintenance")
    "tariff_change"       -> NotifMeta(Icons.Filled.AttachMoney,  Color(0xFFCA8A04), Color(0xFFFEFCE8), "Tariff")
    "new_station"         -> NotifMeta(Icons.Filled.AddLocation,  Color(0xFF2563EB), Color(0xFFEFF6FF), "New Station")
    else                  -> NotifMeta(Icons.Filled.Notifications, Color(0xFF7C3AED), Color(0xFFF5F3FF), "Announcement")
}

private fun timeAgo(isoTime: String): String {
    return try {
        val sdf  = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val date = sdf.parse(isoTime) ?: return isoTime
        val diff = (Date().time - date.time) / 1000
        when {
            diff < 60      -> "just now"
            diff < 3600    -> "${diff / 60}m ago"
            diff < 86400   -> "${diff / 3600}h ago"
            else           -> "${diff / 86400}d ago"
        }
    } catch (e: Exception) { isoTime }
}

@Composable
fun NotificationsScreen(onBack: () -> Unit) {
    val context = LocalContext.current

    var notifications by remember {
        mutableStateOf(EvChargeMessagingService.getNotifications(context))
    }

    LaunchedEffect(Unit) {
        EvChargeMessagingService.markAllRead(context)
        notifications = EvChargeMessagingService.getNotifications(context)
    }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {

        // ── Top bar ──────────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Blue600)
                .statusBarsPadding()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
                Spacer(Modifier.width(4.dp))
                Text(
                    "Notifications",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
                Spacer(Modifier.weight(1f))
                Text(
                    "${notifications.size}",
                    fontSize = 13.sp,
                    color = Color.White.copy(alpha = 0.75f),
                    modifier = Modifier.padding(end = 16.dp),
                )
            }
        }

        // ── List ─────────────────────────────────────────────────────────────
        if (notifications.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .background(Color(0xFFEFF6FF), CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Filled.NotificationsNone, null, tint = Blue600, modifier = Modifier.size(36.dp))
                    }
                    Text("No notifications yet", fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)
                    Text("You'll receive updates about stations here.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(vertical = 8.dp),
            ) {
                items(notifications) { notif ->
                    val meta    = metaFor(notif["type"] ?: "broadcast")
                    val isUnread = notif["read"] == "false"

                    Surface(
                        modifier  = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        shape     = RoundedCornerShape(14.dp),
                        color     = if (isUnread)
                            MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.08f)
                        else
                            MaterialTheme.colorScheme.surface,
                        tonalElevation = if (isUnread) 2.dp else 1.dp,
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.Top,
                        ) {
                            // Icon badge
                            Box(
                                modifier = Modifier
                                    .size(42.dp)
                                    .background(meta.bg, RoundedCornerShape(12.dp)),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(meta.icon, null, tint = meta.tint, modifier = Modifier.size(22.dp))
                            }

                            Column(modifier = Modifier.weight(1f)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = meta.bg,
                                    ) {
                                        Text(
                                            meta.label,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = meta.tint,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        )
                                    }
                                    Text(
                                        timeAgo(notif["time"] ?: ""),
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }

                                Spacer(Modifier.height(4.dp))

                                Text(
                                    notif["title"] ?: "",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    notif["body"] ?: "",
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }

                            if (isUnread) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .background(Blue600, CircleShape)
                                        .align(Alignment.Top)
                                )
                            }
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.windowInsetsBottomHeight(WindowInsets.navigationBars))
                }
            }
        }
    }
}
