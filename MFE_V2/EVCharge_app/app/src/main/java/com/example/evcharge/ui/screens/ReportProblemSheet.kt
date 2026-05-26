package com.example.evcharge.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.evcharge.data.ChargingStation
import com.example.evcharge.data.TicketRepository
import com.example.evcharge.ui.theme.Blue600
import com.example.evcharge.ui.theme.Red500
import kotlinx.coroutines.launch

/**
 * Pre-defined problem categories. The `key` field is the value sent to the
 * server and must match the `tickets.category` MySQL enum exactly.
 */
private data class ProblemOption(
    val key: String,
    val label: String,
    val description: String,
    val icon: ImageVector,
)

private val problemOptions = listOf(
    ProblemOption(
        key = "charger_fault",
        label = "Station not working",
        description = "The charger doesn't power on or won't start a session.",
        icon = Icons.Filled.PowerOff,
    ),
    ProblemOption(
        key = "power_failure",
        label = "Too slow charging",
        description = "Charging speed is far below the rated kW.",
        icon = Icons.Filled.Speed,
    ),
    ProblemOption(
        key = "screen_issue",
        label = "Screen / display issue",
        description = "Touch screen is unresponsive or unreadable.",
        icon = Icons.Filled.ScreenRotation,
    ),
    ProblemOption(
        key = "network_issue",
        label = "Payment or network problem",
        description = "Card not accepted, app can't reach the station, etc.",
        icon = Icons.Filled.SignalWifiOff,
    ),
    ProblemOption(
        key = "maintenance",
        label = "Damaged equipment",
        description = "Broken connector, dirty plug, cable damage…",
        icon = Icons.Filled.Build,
    ),
    ProblemOption(
        key = "system_failure",
        label = "Other issue",
        description = "Something else not covered above.",
        icon = Icons.Filled.MoreHoriz,
    ),
)

@Composable
fun ReportProblemSheet(
    station: ChargingStation,
    onClose: () -> Unit,
    onSubmitted: () -> Unit,
) {
    val context = LocalContext.current
    val scope   = rememberCoroutineScope()
    val repo    = remember { TicketRepository(context) }

    var selected by remember { mutableStateOf(problemOptions[0]) }
    var details  by remember { mutableStateOf("") }
    var busy     by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.5f))
            .clickable(onClick = onClose),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.92f)
                .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                .background(MaterialTheme.colorScheme.surface)
                .clickable(enabled = false, onClick = {})
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp),
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Report a problem", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                    Text(station.name, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = onClose) {
                    Icon(Icons.Filled.Close, "Close", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Spacer(Modifier.height(8.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
            Spacer(Modifier.height(12.dp))

            Text("What's wrong?", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(8.dp))

            // Options
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                problemOptions.forEach { opt ->
                    val isSelected = opt == selected
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSelected) Blue600.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                        modifier = Modifier
                            .fillMaxWidth()
                            .selectable(selected = isSelected, onClick = { selected = opt }),
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            RadioButton(
                                selected = isSelected,
                                onClick = { selected = opt },
                                colors = RadioButtonDefaults.colors(selectedColor = Blue600),
                            )
                            Icon(opt.icon, null, tint = if (isSelected) Blue600 else MaterialTheme.colorScheme.onSurfaceVariant)
                            Column(modifier = Modifier.weight(1f)) {
                                Text(opt.label, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                Text(
                                    opt.description,
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            Text("Add details (optional)", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = details,
                onValueChange = { details = it.take(500) },
                modifier = Modifier.fillMaxWidth().height(96.dp),
                placeholder = { Text("e.g. connector 2 makes a buzzing sound", color = MaterialTheme.colorScheme.onSurfaceVariant) },
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor   = Blue600,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                ),
            )

            Spacer(Modifier.height(16.dp))

            Button(
                onClick = {
                    if (busy) return@Button
                    scope.launch {
                        busy = true
                        repo.report(station.id, selected.key, details.trim().ifBlank { null })
                            .onSuccess {
                                Toast.makeText(context, "Report sent — a technician will look at it.", Toast.LENGTH_LONG).show()
                                onSubmitted()
                            }
                            .onFailure {
                                Toast.makeText(context, it.message ?: "Could not send report", Toast.LENGTH_LONG).show()
                            }
                        busy = false
                    }
                },
                enabled = !busy,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Red500),
            ) {
                if (busy) {
                    CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                } else {
                    Icon(Icons.Filled.Send, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Send report to technician", fontSize = 15.sp, fontWeight = FontWeight.Medium)
                }
            }

            Spacer(modifier = Modifier.windowInsetsBottomHeight(WindowInsets.navigationBars))
        }
    }
}
