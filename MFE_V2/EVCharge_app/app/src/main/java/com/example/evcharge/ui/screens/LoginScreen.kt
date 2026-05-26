package com.example.evcharge.ui.screens

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.evcharge.R
import com.example.evcharge.data.AppUser
import com.example.evcharge.data.AuthRepository
import com.example.evcharge.ui.theme.Blue600
import com.example.evcharge.ui.theme.Blue700
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    onClose: () -> Unit,
    onLoginSuccess: (AppUser) -> Unit,
) {
    var isSignUp by remember { mutableStateOf(false) }
    var fullName by remember { mutableStateOf("") }
    var email    by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var phone    by remember { mutableStateOf("") }
    var busy     by remember { mutableStateOf(false) }

    val context  = LocalContext.current
    val scope    = rememberCoroutineScope()
    val authRepo = remember { AuthRepository(context) }

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
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.surface)
                .clickable(enabled = false, onClick = {}),
        ) {
            // Brand header
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.linearGradient(listOf(Color(0xFF1D4ED8), Color(0xFF2563EB)))
                    )
                    .padding(vertical = 28.dp),
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Image(
                        painter = painterResource(R.drawable.ev_logo),
                        contentDescription = "EV Charge DZ",
                        modifier = Modifier.size(72.dp),
                    )
                    Text(
                        "EV Charge DZ",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        letterSpacing = (-0.3).sp,
                    )
                    Text(
                        if (isSignUp) "Create your account" else "Welcome back",
                        fontSize = 13.sp,
                        color = Color.White.copy(alpha = 0.75f),
                    )
                }
                IconButton(
                    onClick = onClose,
                    modifier = Modifier.align(Alignment.TopEnd).padding(4.dp),
                ) {
                    Icon(Icons.Filled.Close, "Close", tint = Color.White.copy(alpha = 0.8f))
                }
            }

            Column(
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                AnimatedVisibility(visible = isSignUp, enter = fadeIn(), exit = fadeOut()) {
                    EVTextField(
                        value = fullName, onValueChange = { fullName = it },
                        label = "Full Name", placeholder = "First Last",
                        keyboardType = KeyboardType.Text,
                        leadingIcon = {
                            Icon(Icons.Filled.Person, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        },
                    )
                }

                EVTextField(
                    value = email, onValueChange = { email = it },
                    label = "Email", placeholder = "your@email.com",
                    keyboardType = KeyboardType.Email,
                    leadingIcon = {
                        Icon(Icons.Filled.Email, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    },
                )

                AnimatedVisibility(visible = isSignUp, enter = fadeIn(), exit = fadeOut()) {
                    EVTextField(
                        value = phone, onValueChange = { phone = it },
                        label = "Phone Number", placeholder = "5XX XX XX XX",
                        keyboardType = KeyboardType.Phone,
                        leadingIcon = {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(start = 12.dp),
                            ) {
                                Text(
                                    "DZ +213",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Spacer(Modifier.width(8.dp))
                                VerticalDivider(modifier = Modifier.height(20.dp), color = MaterialTheme.colorScheme.outline)
                            }
                        },
                    )
                }

                EVTextField(
                    value = password, onValueChange = { password = it },
                    label = "Password", placeholder = "••••••••",
                    keyboardType = KeyboardType.Password,
                    isPassword = true,
                    leadingIcon = {
                        Icon(Icons.Filled.Lock, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    },
                )

                Button(
                    onClick = {
                        if (busy) return@Button
                        scope.launch {
                            busy = true
                            try {
                                if (isSignUp) {
                                    if (email.isBlank() || password.isBlank() ||
                                        phone.isBlank()  || fullName.isBlank()
                                    ) {
                                        Toast.makeText(context, "Please fill all fields", Toast.LENGTH_SHORT).show()
                                        return@launch
                                    }
                                    authRepo.register(
                                        email    = email.trim(),
                                        password = password,
                                        fullName = fullName.trim(),
                                        phone    = phone.trim(),
                                    ).onSuccess { onLoginSuccess(it) }
                                     .onFailure { Toast.makeText(context, it.message ?: "Sign up failed", Toast.LENGTH_LONG).show() }
                                } else {
                                    if (email.isBlank() || password.isBlank()) {
                                        Toast.makeText(context, "Email and password are required", Toast.LENGTH_SHORT).show()
                                        return@launch
                                    }
                                    authRepo.login(email.trim(), password)
                                        .onSuccess { onLoginSuccess(it) }
                                        .onFailure { Toast.makeText(context, it.message ?: "Login failed", Toast.LENGTH_LONG).show() }
                                }
                            } finally {
                                busy = false
                            }
                        }
                    },
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Blue600),
                ) {
                    if (busy) {
                        CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                    } else {
                        Text(if (isSignUp) "Sign Up" else "Login", fontSize = 16.sp, fontWeight = FontWeight.Medium)
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Text(
                        if (isSignUp) "Already have an account? " else "Don't have an account? ",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        if (isSignUp) "Login" else "Sign Up",
                        fontSize = 14.sp,
                        color = Blue600,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.clickable { isSignUp = !isSignUp },
                    )
                }
            }

            Spacer(modifier = Modifier.windowInsetsBottomHeight(WindowInsets.navigationBars))
        }
    }
}

@Composable
fun EVTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    isPassword: Boolean = false,
    leadingIcon: @Composable (() -> Unit)? = null,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text(placeholder, color = MaterialTheme.colorScheme.onSurfaceVariant) },
            leadingIcon = leadingIcon,
            visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor      = Blue600,
                unfocusedBorderColor    = MaterialTheme.colorScheme.outline,
                focusedContainerColor   = MaterialTheme.colorScheme.surface,
                unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
            ),
        )
    }
}
