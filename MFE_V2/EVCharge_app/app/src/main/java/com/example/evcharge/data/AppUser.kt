package com.example.evcharge.data

/** Lightweight, server-driven user record. No local DB. */
data class AppUser(
    val appUserId: String,
    val email: String,
    val fullName: String,
    val phone: String?,
)
