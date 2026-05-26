package com.example.evcharge.data

data class ChargingStation(
    val id: String             = "",
    val name: String,
    val address: String,
    val latitude: Double       = 0.0,
    val longitude: Double      = 0.0,
    val available: Boolean,
    val status: String         = if (available) "available" else "charging",
    val power: String,
    val distance: String,
    val price: String,
    val chargingTime: String,
    val connectorTypes: String = "",  // comma-separated, e.g. "CCS2, Type 2"
    val availableConnectors: Int = 0,
    val totalConnectors: Int     = 0,
)
