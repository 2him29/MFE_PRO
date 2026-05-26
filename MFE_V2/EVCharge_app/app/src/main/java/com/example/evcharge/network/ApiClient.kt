package com.example.evcharge.network

import com.google.gson.GsonBuilder
import com.google.gson.JsonDeserializer
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private val BASE_URL = ServerConfig.HTTP_BASE

    // MySQL2 returns DECIMAL columns as JSON strings ("36.75") not numbers.
    // This adapter coerces string-quoted numbers into Double so Gson doesn't throw.
    private val lenientDouble = JsonDeserializer<Double> { json, _, _ ->
        when {
            json.isJsonNull -> 0.0
            json.isJsonPrimitive && json.asJsonPrimitive.isString ->
                json.asString.toDoubleOrNull() ?: 0.0
            else -> json.asDouble
        }
    }

    private val gson = GsonBuilder()
        .registerTypeAdapter(Double::class.java,           lenientDouble)
        .registerTypeAdapter(Double::class.javaObjectType, lenientDouble)
        .create()

    private val logging = HttpLoggingInterceptor().apply {
        level = if (com.example.evcharge.BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
                else HttpLoggingInterceptor.Level.NONE
    }

    private val httpClient = OkHttpClient.Builder()
        .addInterceptor(logging)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(httpClient)
        .addConverterFactory(GsonConverterFactory.create(gson))
        .build()

    /** Held in memory after a successful login. Persisted to SharedPreferences by TokenStore. */
    var authToken: String? = null

    fun authenticatedClient(): OkHttpClient =
        OkHttpClient.Builder()
            .addInterceptor(logging)
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .apply { authToken?.let { addHeader("Authorization", "Bearer $it") } }
                    .build()
                chain.proceed(request)
            }
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()

    fun authenticatedRetrofit(): Retrofit =
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(authenticatedClient())
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
}
