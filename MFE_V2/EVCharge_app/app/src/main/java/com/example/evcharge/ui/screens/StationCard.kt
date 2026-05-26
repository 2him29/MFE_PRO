package com.example.evcharge.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.evcharge.data.ChargingStation
import com.example.evcharge.ui.theme.Blue600
import com.example.evcharge.ui.theme.Green500
import com.example.evcharge.ui.theme.Purple500
import com.example.evcharge.ui.theme.Red500
import com.example.evcharge.ui.theme.Yellow500
import com.example.evcharge.ui.theme.Amber500

@Composable
fun StationCard(
    station: ChargingStation,
    onClose: () -> Unit,
    onNavigate: () -> Unit,
    onReport: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 20.dp,
        tonalElevation = 2.dp,
    ) {
        Column(modifier = Modifier.padding(bottom = 8.dp)) {

            // Drag handle
            Box(
                modifier = Modifier
                    .padding(top = 12.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.25f))
                    .align(Alignment.CenterHorizontally),
            )

            Spacer(Modifier.height(16.dp))

            // Header row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        station.name,
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Spacer(Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Icon(
                            Icons.Filled.LocationOn,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(14.dp),
                        )
                        Text(
                            station.address,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                IconButton(onClick = onClose) {
                    Icon(
                        Icons.Filled.Close,
                        contentDescription = "Close",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            Spacer(Modifier.height(14.dp))

            // Status + connector count row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                val statusColor = when (station.status) {
                    "available"   -> Green500
                    "charging"    -> Blue600
                    "fault"       -> Red500
                    "maintenance" -> Amber500
                    else          -> Color.Gray
                }
                val statusLabel = when (station.status) {
                    "available"   -> "Available"
                    "charging"    -> "Charging"
                    "fault"       -> "Fault"
                    "maintenance" -> "Maintenance"
                    "offline"     -> "Offline"
                    else          -> station.status
                }
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = statusColor.copy(alpha = 0.12f),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(5.dp),
                    ) {
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(statusColor),
                        )
                        Text(
                            statusLabel,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = statusColor,
                        )
                    }
                }

                if (station.totalConnectors > 0) {
                    Text(
                        "${station.availableConnectors}/${station.totalConnectors} ports free",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            // Connector type badges
            val connectors = station.connectorTypes
                .split(",")
                .map { it.trim() }
                .filter { it.isNotEmpty() }

            if (connectors.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    items(connectors) { type ->
                        ConnectorBadge(type)
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
            HorizontalDivider(
                modifier = Modifier.padding(horizontal = 20.dp),
                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f),
            )
            Spacer(Modifier.height(12.dp))

            // Info grid
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                InfoChip(Icons.Filled.Bolt,        Yellow500, station.power,      Modifier.weight(1f))
                InfoChip(Icons.Filled.AttachMoney, Blue600,   station.price,      Modifier.weight(1f))
                InfoChip(Icons.Filled.Schedule,    Purple500, station.chargingTime, Modifier.weight(1f))
            }

            Spacer(Modifier.height(20.dp))

            // CTA buttons
            Column(
                modifier = Modifier.padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Button(
                    onClick = onNavigate,
                    enabled = station.available,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor         = Blue600,
                        disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                    ),
                ) {
                    Icon(Icons.Filled.Navigation, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        if (station.available) "Navigate to Station" else "Station Unavailable",
                        style = MaterialTheme.typography.labelLarge,
                    )
                }

                OutlinedButton(
                    onClick = onReport,
                    modifier = Modifier.fillMaxWidth().height(46.dp),
                    shape = RoundedCornerShape(14.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        width = 1.dp,
                    ),
                ) {
                    Icon(Icons.Filled.Report, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Report a problem", style = MaterialTheme.typography.labelLarge)
                }
            }

            Spacer(modifier = Modifier.windowInsetsBottomHeight(WindowInsets.navigationBars))
        }
    }
}

@Composable
private fun ConnectorBadge(type: String) {
    val (bg, fg) = when {
        type.contains("CCS", ignoreCase = true)      -> Color(0xFFEFF6FF) to Color(0xFF1D4ED8)
        type.contains("CHAdeMO", ignoreCase = true)  -> Color(0xFFFFF7ED) to Color(0xFFC2410C)
        type.contains("Type 2", ignoreCase = true) ||
        type.contains("T2", ignoreCase = true)       -> Color(0xFFF0FDF4) to Color(0xFF15803D)
        type.contains("Schuko", ignoreCase = true)   -> Color(0xFFFAF5FF) to Color(0xFF7E22CE)
        else                                          -> Color(0xFFF8FAFC) to Color(0xFF475569)
    }
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = bg,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(
                Icons.Filled.ElectricBolt,
                contentDescription = null,
                tint = fg,
                modifier = Modifier.size(12.dp),
            )
            Text(type, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = fg)
        }
    }
}

@Composable
private fun InfoChip(
    icon: ImageVector,
    tint: Color,
    value: String,
    modifier: Modifier = Modifier,
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
        modifier = modifier,
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp))
            Text(
                value,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
            )
        }
    }
}

@Composable
fun StationInfoRow(
    label: String,
    icon: ImageVector? = null,
    iconTint: Color = Color.Gray,
    value: String? = null,
    trailingContent: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (trailingContent != null) {
            trailingContent()
        } else if (value != null && icon != null) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(16.dp))
                Text(
                    value,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
}
