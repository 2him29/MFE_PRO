package com.example.evcharge.network

/**
 * Backend address used by both Retrofit and the WebSocket client.
 *
 *  ▸ 10.0.2.2 is the Android emulator's loopback to the host PC.
 *  ▸ For a real device, change HOST to your PC's LAN IP (e.g. "192.168.1.42")
 *    and make sure Windows Firewall allows inbound TCP/3001.
 */
object ServerConfig {
    const val HTTP_BASE = "https://pauline-unsegmented-malena.ngrok-free.dev/"
    // ngrok tunnels WebSocket on the same domain — replace https:// with wss://
    const val WS_URL    = "wss://pauline-unsegmented-malena.ngrok-free.dev/ws"
}
