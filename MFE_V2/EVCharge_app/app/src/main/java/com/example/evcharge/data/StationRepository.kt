package com.example.evcharge.data

import com.example.evcharge.network.ApiClient
import com.example.evcharge.network.ApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class StationRepository {

    private val api: ApiService = ApiClient.retrofit.create(ApiService::class.java)

    suspend fun getStations(): Result<List<ChargingStation>> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.getStations()
                if (response.isSuccessful) {
                    Result.success(response.body()?.map { it.toChargingStation() } ?: emptyList())
                } else {
                    Result.failure(Exception("Server error: ${response.code()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun getStation(id: String): Result<ChargingStation> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.getStation(id)
                if (response.isSuccessful) {
                    response.body()?.toChargingStation()?.let { Result.success(it) }
                        ?: Result.failure(Exception("Station not found"))
                } else {
                    Result.failure(Exception("Server error: ${response.code()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
}
