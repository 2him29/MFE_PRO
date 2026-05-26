package com.example.evcharge.network

import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ── Auth ─────────────────────────────────────────────────────────────────
    @POST("api/app/auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<AuthResponse>

    @POST("api/app/auth/login")
    suspend fun login(@Body body: LoginRequest): Response<AuthResponse>

    @POST("api/app/auth/fcm-token")
    suspend fun registerFcmToken(
        @Header("Authorization") token: String,
        @Body body: FcmTokenRequest,
    ): Response<GenericResponse>

    // ── Stations (public) ────────────────────────────────────────────────────
    @GET("api/app/stations")
    suspend fun getStations(): Response<List<ApiStation>>

    @GET("api/app/stations/{id}")
    suspend fun getStation(@Path("id") id: String): Response<ApiStation>

    // ── Sessions (auth) ──────────────────────────────────────────────────────
    @GET("api/app/sessions")
    suspend fun getSessions(
        @Header("Authorization") token: String,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0,
    ): Response<List<ApiSession>>

    @POST("api/app/sessions")
    suspend fun startSession(
        @Header("Authorization") token: String,
        @Body body: StartSessionRequest,
    ): Response<StartSessionResponse>

    @PATCH("api/app/sessions/{id}")
    suspend fun stopSession(
        @Header("Authorization") token: String,
        @Path("id") sessionId: String,
        @Body body: StopSessionRequest,
    ): Response<StopSessionResponse>

    // ── Tickets (auth) ───────────────────────────────────────────────────────
    @POST("api/app/tickets")
    suspend fun reportProblem(
        @Header("Authorization") token: String,
        @Body body: CreateTicketRequest,
    ): Response<CreateTicketResponse>
}
