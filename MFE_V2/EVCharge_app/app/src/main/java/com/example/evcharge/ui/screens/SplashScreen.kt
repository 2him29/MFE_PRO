package com.example.evcharge.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.evcharge.R
import kotlinx.coroutines.delay

private val NavyDark   = Color(0xFF0F172A)
private val NavyMid    = Color(0xFF1E3A5F)
private val ElectricBlue = Color(0xFF2563EB)
private val CyanGlow   = Color(0xFF38BDF8)
private val CyanDot    = Color(0xFF7DD3FC)

@Composable
fun SplashScreen(onFinished: () -> Unit) {
    var alpha by remember { mutableFloatStateOf(1f) }
    val animatedAlpha by animateFloatAsState(
        targetValue   = alpha,
        animationSpec = tween(durationMillis = 500),
        label         = "splashAlpha",
    )

    LaunchedEffect(Unit) {
        delay(1800)
        alpha = 0f
        delay(550)
        onFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .alpha(animatedAlpha)
            .background(
                Brush.verticalGradient(listOf(NavyDark, NavyMid, ElectricBlue))
            ),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            Box(contentAlignment = Alignment.Center) {
                val pulse = rememberInfiniteTransition(label = "glow")
                val glow by pulse.animateFloat(
                    0.25f, 0.75f,
                    infiniteRepeatable(tween(1200), RepeatMode.Reverse),
                    label = "glowAlpha",
                )
                Box(
                    Modifier
                        .size(200.dp)
                        .alpha(glow)
                        .background(CyanGlow.copy(alpha = 0.25f), RoundedCornerShape(100.dp))
                )
                Image(
                    painter = painterResource(R.drawable.ev_logo),
                    contentDescription = "EV Charge DZ",
                    modifier = Modifier.size(140.dp),
                )
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    "EV Charge DZ",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    textAlign = TextAlign.Center,
                    letterSpacing = (-0.5).sp,
                )
                Text(
                    "Réseau de recharge en Algérie",
                    fontSize = 14.sp,
                    color = Color.White.copy(alpha = 0.8f),
                    textAlign = TextAlign.Center,
                )
            }

            BouncingDots()
        }
    }
}

@Composable
private fun BouncingDots() {
    val infiniteTransition = rememberInfiniteTransition(label = "dots")
    val delays = listOf(0, 150, 300)
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        delays.forEach { d ->
            val offsetY by infiniteTransition.animateFloat(
                0f, -10f,
                infiniteRepeatable(
                    tween(600, delayMillis = d, easing = FastOutSlowInEasing),
                    RepeatMode.Reverse,
                ),
                label = "dot_$d",
            )
            Box(
                Modifier
                    .size(8.dp)
                    .offset(y = offsetY.dp)
                    .background(CyanDot, RoundedCornerShape(4.dp))
            )
        }
    }
}
