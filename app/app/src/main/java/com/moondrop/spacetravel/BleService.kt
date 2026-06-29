package com.moondrop.spacetravel

import android.app.Service
import android.bluetooth.*
import android.content.Intent
import android.os.Binder
import android.os.IBinder
import android.util.Log
import java.util.*

class BleService : Service() {

    companion object {
        const val TAG = "BleService"

        // GAIA UUIDs (from decompiled MOONDROP Link code)
        val GAIA_SERVICE: UUID = UUID.fromString("00001100-d102-11e1-9b23-00025b00a5a5")
        val GAIA_CMD: UUID = UUID.fromString("00001101-d102-11e1-9b23-00025b00a5a5")
        val GAIA_RSP: UUID = UUID.fromString("00001102-d102-11e1-9b23-00025b00a5a5")
        val GAIA_DATA: UUID = UUID.fromString("00001103-d102-11e1-9b23-00025b00a5a5")

        const val VENDOR_ID = 0x001D
    }

    private val binder = LocalBinder()
    private var gatt: BluetoothGatt? = null
    private var cmdChar: BluetoothGattCharacteristic? = null

    inner class LocalBinder : Binder() {
        fun getService(): BleService = this@BleService
    }

    override fun onBind(intent: Intent): IBinder = binder

    fun sendCommand(feature: Int, command: Int, payload: ByteArray = ByteArray(0)): Boolean {
        val c = cmdChar ?: return false

        val cmdVal = (feature shl 9) or (command and 0x7F)
        val packet = ByteArray(4 + payload.size)
        packet[0] = (VENDOR_ID and 0xFF).toByte()
        packet[1] = ((VENDOR_ID shr 8) and 0xFF).toByte()
        packet[2] = (cmdVal and 0xFF).toByte()
        packet[3] = ((cmdVal shr 8) and 0xFF).toByte()
        if (payload.isNotEmpty()) {
            System.arraycopy(payload, 0, packet, 4, payload.size)
        }

        c.value = packet
        return gatt?.writeCharacteristic(c) ?: false
    }

    override fun onDestroy() {
        super.onDestroy()
        gatt?.disconnect()
        gatt?.close()
    }
}
