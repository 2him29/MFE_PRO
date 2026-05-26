package com.example.evcharge.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary            = Blue600,
    onPrimary          = Color.White,
    primaryContainer   = Color(0xFFDBEAFE),
    onPrimaryContainer = Blue700,
    secondary          = Green600,
    onSecondary        = Color.White,
    tertiary           = Amber500,
    onTertiary         = Color.White,
    background         = Color(0xFFF8FAFC),
    onBackground       = Color(0xFF0F172A),
    surface            = Color.White,
    onSurface          = Color(0xFF0F172A),
    surfaceVariant     = Color(0xFFF1F5F9),
    onSurfaceVariant   = Color(0xFF64748B),
    outline            = Color(0xFFCBD5E1),
    error              = Red500,
    onError            = Color.White,
)

private val DarkColors = darkColorScheme(
    primary            = Color(0xFF60A5FA),
    onPrimary          = Navy900,
    primaryContainer   = Blue700,
    onPrimaryContainer = Color(0xFFDBEAFE),
    secondary          = Green500,
    onSecondary        = Navy900,
    tertiary           = Amber500,
    onTertiary         = Navy900,
    background         = Navy900,
    onBackground       = Color(0xFFF1F5F9),
    surface            = Navy800,
    onSurface          = Color(0xFFF1F5F9),
    surfaceVariant     = Navy700,
    onSurfaceVariant   = Color(0xFF94A3B8),
    outline            = Navy600,
    error              = Color(0xFFFCA5A5),
    onError            = Color(0xFF7F1D1D),
)

@Composable
fun EVChargeTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography  = Typography,
        content     = content,
    )
}
