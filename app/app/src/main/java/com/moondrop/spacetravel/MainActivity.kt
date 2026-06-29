package com.moondrop.spacetravel

import android.Manifest
import android.bluetooth.*
import android.bluetooth.le.*
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var tvStatus: TextView
    private lateinit var btnScan: Button
    private lateinit var listDevices: ListView
    private lateinit var btnBattery: Button
    private lateinit var tvBattery: TextView
    private lateinit var btnGetEQ: Button
    private lateinit var btnSetEQ: Button
    private lateinit var spinnerEQ: Spinner
    private lateinit var tvEQ: TextView
    private lateinit var spinnerAction: Spinner
    private lateinit var btnSetTouch: Button
    private lateinit var tvLog: TextView
    private lateinit var scrollLog: ScrollView

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var leScanner: BluetoothLeScanner? = null

    private val deviceList = mutableListOf<BluetoothDevice>()
    private val deviceNames = mutableListOf<String>()

    private val PERMISSION_REQUEST_CODE = 1001

    // RFCOMM 连接
    private var rfcommSocket: BluetoothSocket? = null
    private var inputStream: InputStream? = null
    private var outputStream: OutputStream? = null
    private var connectedDevice: BluetoothDevice? = null

    private val eqPresets = arrayOf("默认", "流行", "摇滚", "古典", "爵士", "自定义")
    private val touchActions = arrayOf("暂停/播放", "上一曲", "下一曲", "音量+", "音量-", "接听/挂断")

    companion object {
        // MOONDROP APP 使用的 RFCOMM UUID
        val MOONDROP_UUID: UUID = UUID.fromString("0000fd2d-0000-1000-8000-00805f9b34fb")

        // GAIA Protocol
        const val VENDOR_ID = 0x001D
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        initViews()
        initBluetooth()
        setupListeners()
    }

    private fun initViews() {
        tvStatus = findViewById(R.id.tvStatus)
        btnScan = findViewById(R.id.btnScan)
        listDevices = findViewById(R.id.listDevices)
        btnBattery = findViewById(R.id.btnBattery)
        tvBattery = findViewById(R.id.tvBattery)
        btnGetEQ = findViewById(R.id.btnGetEQ)
        btnSetEQ = findViewById(R.id.btnSetEQ)
        spinnerEQ = findViewById(R.id.spinnerEQ)
        tvEQ = findViewById(R.id.tvEQ)
        spinnerAction = findViewById(R.id.spinnerAction)
        btnSetTouch = findViewById(R.id.btnSetTouch)
        tvLog = findViewById(R.id.tvLog)
        scrollLog = findViewById(R.id.scrollLog)

        spinnerEQ.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, eqPresets)
        spinnerAction.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, touchActions)
    }

    private fun initBluetooth() {
        val bm = getSystemService(BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bm.adapter

        if (bluetoothAdapter == null) {
            log("ERROR: 设备不支持蓝牙")
            return
        }

        if (!bluetoothAdapter!!.isEnabled) {
            log("蓝牙未开启，请求开启...")
            startActivityForResult(Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE), 1)
        } else {
            log("蓝牙已就绪")
            leScanner = bluetoothAdapter!!.bluetoothLeScanner
        }

        val filter = IntentFilter().apply {
            addAction(BluetoothDevice.ACTION_FOUND)
            addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
        }
        registerReceiver(bluetoothReceiver, filter)
    }

    private val bluetoothReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                BluetoothDevice.ACTION_FOUND -> {
                    val device = intent.getParcelableExtra<BluetoothDevice>(BluetoothDevice.EXTRA_DEVICE)
                    val rssi = intent.getShortExtra(BluetoothDevice.EXTRA_RSSI, Short.MIN_VALUE)
                    device?.let { addDevice(it, rssi) }
                }
                BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> {
                    log("经典蓝牙扫描完成")
                }
            }
        }
    }

    private fun setupListeners() {
        btnScan.setOnClickListener { startScan() }
        btnBattery.setOnClickListener { getBattery() }
        btnGetEQ.setOnClickListener { getEQState() }
        btnSetEQ.setOnClickListener { setEQPreset() }
        btnSetTouch.setOnClickListener { setTouchAction() }

        listDevices.setOnItemClickListener { _, _, position, _ ->
            if (position < deviceList.size) {
                connectDevice(deviceList[position])
            }
        }
    }

    private fun startScan() {
        if (!hasPermissions()) {
            requestPermissions()
            return
        }

        deviceList.clear()
        deviceNames.clear()
        updateDeviceList()

        log("========== 开始扫描 ==========")
        loadPairedDevices()

        leScanner?.startScan(leScanCallback)
        log("[BLE] 扫描已启动")

        bluetoothAdapter?.startDiscovery()
        log("[Classic] 扫描已启动")

        btnScan.postDelayed({
            leScanner?.stopScan(leScanCallback)
            bluetoothAdapter?.cancelDiscovery()
            log("========== 扫描结束 ==========")
            log("共发现 ${deviceList.size} 个设备")
            if (deviceList.isEmpty()) {
                deviceNames.add("未发现任何设备")
                updateDeviceList()
            }
        }, 15000)
    }

    private fun loadPairedDevices() {
        log("[配对] 加载已配对设备...")
        try {
            bluetoothAdapter?.bondedDevices?.forEach { device ->
                val name = try { device.name } catch (e: SecurityException) { null } ?: "未知"
                log("[配对]   $name (${device.address})")
                addDevice(device, 0)
            }
        } catch (e: SecurityException) {
            log("[配对] 需要权限")
        }
    }

    private val leScanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val device = result.device
            val name = try { device.name } catch (e: SecurityException) { null } ?: "未知"
            log("[BLE] $name (${device.address}) RSSI:${result.rssi}")
            addDevice(device, result.rssi.toShort())
        }
        override fun onScanFailed(errorCode: Int) {
            log("[BLE] 扫描失败: errorCode=$errorCode")
        }
    }

    private fun addDevice(device: BluetoothDevice, rssi: Short) {
        runOnUiThread {
            if (deviceList.none { it.address == device.address }) {
                val name = try { device.name } catch (e: SecurityException) { null } ?: "未知"
                deviceList.add(device)
                val bondState = when (device.bondState) {
                    BluetoothDevice.BOND_BONDED -> "已配对"
                    BluetoothDevice.BOND_BONDING -> "配对中"
                    else -> "未配对"
                }
                deviceNames.add("$name\n${device.address} [$bondState]")
                updateDeviceList()
                log("  + $name (${device.address})")
            }
        }
    }

    private fun updateDeviceList() {
        runOnUiThread {
            listDevices.adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, deviceNames)
        }
    }

    // ==================== RFCOMM 连接 ====================

    private fun connectDevice(device: BluetoothDevice) {
        val name = try { device.name } catch (e: SecurityException) { null } ?: "未知"
        log("========== 连接设备 ==========")
        log("目标: $name (${device.address})")
        tvStatus.text = "连接中: $name"
        tvStatus.setTextColor(0xFFFFA500.toInt())
        connectedDevice = device

        Thread {
            bluetoothAdapter?.cancelDiscovery()

            // 方案1: 使用 UUID 连接
            try {
                log("[1] 尝试 UUID 连接...")
                val socket = device.createRfcommSocketToServiceRecord(MOONDROP_UUID)
                rfcommSocket = socket
                socket.connect()
                inputStream = socket.inputStream
                outputStream = socket.outputStream
                log("[1] UUID 连接成功!")
                runOnUiThread { tvStatus.text = "已连接: $name"; tvStatus.setTextColor(0xFF00FF00.toInt()) }
                startReadThread()
                return@Thread
            } catch (e: IOException) {
                log("[1] UUID 失败: ${e.message}")
                try { rfcommSocket?.close() } catch (e2: Exception) {}
            }

            // 方案2: 尝试常用 RFCOMM channels (1, 2, 3...)
            val channelsToTry = listOf(1, 2, 3, 4, 5, 6, 7, 8, 16)
            for (ch in channelsToTry) {
                try {
                    log("[2] 尝试 channel $ch ...")
                    val method = device.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
                    val socket = method.invoke(device, ch) as BluetoothSocket
                    rfcommSocket = socket
                    socket.connect()
                    inputStream = socket.inputStream
                    outputStream = socket.outputStream
                    log("[2] Channel $ch 连接成功!")
                    runOnUiThread { tvStatus.text = "已连接: $name (ch$ch)"; tvStatus.setTextColor(0xFF00FF00.toInt()) }
                    startReadThread()
                    return@Thread
                } catch (e: IOException) {
                    try { rfcommSocket?.close() } catch (e2: Exception) {}
                }
            }

            // 方案3: Insecure RFCOMM channel 1
            try {
                log("[3] 尝试 Insecure channel 1...")
                val method = device.javaClass.getMethod("createInsecureRfcommSocket", Int::class.javaPrimitiveType)
                val socket = method.invoke(device, 1) as BluetoothSocket
                rfcommSocket = socket
                socket.connect()
                inputStream = socket.inputStream
                outputStream = socket.outputStream
                log("[3] Insecure 连接成功!")
                runOnUiThread { tvStatus.text = "已连接: $name (insecure)"; tvStatus.setTextColor(0xFF00FF00.toInt()) }
                startReadThread()
                return@Thread
            } catch (e: IOException) {
                log("[3] Insecure 也失败: ${e.message}")
                try { rfcommSocket?.close() } catch (e2: Exception) {}
            }

            log("所有方案都失败!")
            log("请确认:")
            log("  1. 耳机已开机且在范围内")
            log("  2. 在系统蓝牙设置中先取消配对")
            log("  3. 重新配对后再试")
            runOnUiThread { tvStatus.text = "连接失败"; tvStatus.setTextColor(0xFFFF0000.toInt()) }
        }.start()
    }

    private fun startReadThread() {
        Thread {
            val buffer = ByteArray(1024)
            while (rfcommSocket?.isConnected == true) {
                try {
                    val bytes = inputStream?.read(buffer) ?: break
                    if (bytes > 0) {
                        val data = buffer.copyOf(bytes)
                        log("[RFCOMM] 收到: ${data.toHex()}")
                        handleGaiaResponse(data)
                    }
                } catch (e: IOException) {
                    log("[RFCOMM] 读取错误: ${e.message}")
                    break
                }
            }
            log("[RFCOMM] 连接已断开")
            runOnUiThread {
                tvStatus.text = "已断开"
                tvStatus.setTextColor(0xFFFF0000.toInt())
            }
        }.start()
    }

    // ==================== GAIA 命令 ====================

    private fun sendGaiaCommand(feature: Int, command: Int, payload: ByteArray = ByteArray(0)): Boolean {
        if (outputStream == null) {
            log("[GAIA] 未连接")
            return false
        }

        val cmdVal = (feature shl 9) or (command and 0x7F)
        val packet = ByteArray(4 + payload.size)
        packet[0] = (VENDOR_ID and 0xFF).toByte()
        packet[1] = ((VENDOR_ID shr 8) and 0xFF).toByte()
        packet[2] = (cmdVal and 0xFF).toByte()
        packet[3] = ((cmdVal shr 8) and 0xFF).toByte()
        if (payload.isNotEmpty()) {
            System.arraycopy(payload, 0, packet, 4, payload.size)
        }

        log("[GAIA] 发送: feature=$feature cmd=$command data=${packet.toHex()}")

        return try {
            outputStream?.write(packet)
            outputStream?.flush()
            true
        } catch (e: IOException) {
            log("[GAIA] 发送失败: ${e.message}")
            false
        }
    }

    private fun handleGaiaResponse(data: ByteArray) {
        if (data.size < 4) return

        val vendorId = (data[0].toInt() and 0xFF) or ((data[1].toInt() and 0xFF) shl 8)
        val cmdVal = (data[2].toInt() and 0xFF) or ((data[3].toInt() and 0xFF) shl 8)
        val feature = (cmdVal shr 9) and 0x7F
        val cmdType = (cmdVal shr 7) and 0x03
        val command = cmdVal and 0x7F
        val payload = data.copyOfRange(4, data.size)

        log("[GAIA] 响应: vendor=$vendorId feature=$feature type=$cmdType cmd=$command payload=${payload.toHex()}")

        if (feature == 0 && command == 1 && payload.size >= 2) {
            val left = payload[0].toInt() and 0xFF
            val right = payload[1].toInt() and 0xFF
            runOnUiThread { tvBattery.text = "L: $left%  R: $right%" }
            log("[电池] 左耳: $left%  右耳: $right%")
        }
    }

    // ==================== 功能按钮 ====================

    private fun getBattery() {
        log("获取电池电量...")
        sendGaiaCommand(0, 1, byteArrayOf(0x01, 0x02))
    }

    private fun getEQState() {
        log("获取EQ状态...")
        sendGaiaCommand(7, 0)
    }

    private fun setEQPreset() {
        val index = spinnerEQ.selectedItemPosition
        log("设置EQ预设: ${eqPresets[index]}")
        sendGaiaCommand(7, 3, byteArrayOf(index.toByte()))
    }

    private fun setTouchAction() {
        val index = spinnerAction.selectedItemPosition
        log("设置触控: ${touchActions[index]}")
    }

    // ==================== 工具方法 ====================

    private fun log(message: String) {
        runOnUiThread {
            val ts = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
            tvLog.append("[$ts] $message\n")
            scrollLog.fullScroll(ScrollView.FOCUS_DOWN)
        }
    }

    private fun hasPermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
        } else {
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun requestPermissions() {
        val perms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
        } else {
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        }
        ActivityCompat.requestPermissions(this, perms, PERMISSION_REQUEST_CODE)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
            log("权限已获取")
            leScanner = bluetoothAdapter?.bluetoothLeScanner
            startScan()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        leScanner?.stopScan(leScanCallback)
        bluetoothAdapter?.cancelDiscovery()
        try { rfcommSocket?.close() } catch (e: Exception) {}
        unregisterReceiver(bluetoothReceiver)
    }

    private fun ByteArray?.toHex(): String {
        if (this == null) return "null"
        return joinToString(" ") { String.format("%02X", it) }
    }
}
