package com.example.evcharge.network

/**
 * Backend address used by both Retrofit and the WebSocket client.
 *
 *  ▸ 10.0.2.2 is the Android emulator's loopback to the host PC.
 *  ▸ For a real device, change HOST to your PC's LAN IP (e.g. "192.168.1.42")
 *    and make sure Windows Firewall allows inbound TCP/3001.
 */
object ServerConfig {
    // 10.0.2.2 = host PC from any Android emulator.
    // Switch to your PC's LAN IP (e.g. "192.168.0.101") when running on a physical device.
    const val HOST      = "192.168.1.118"
    const val PORT      = 3001
    const val HTTP_BASE = "http://$HOST:$PORT/"
    const val WS_URL    = "ws://$HOST:$PORT/ws"
}
