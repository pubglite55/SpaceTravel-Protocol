# Moondrop Space Travel 耳机连接协议分析

## 1. 概述

Moondrop Space Travel 耳机通过蓝牙与手机APP (MOONDROP Link) 通信。

> **重要说明**: MOONDROP Link 是通用APP，代码中包含水月雨全系TWS耳机的功能支持。以下标注 ⚠️ 的功能为 Space Travel **不支持**的功能，属于 APP 为其他高端型号准备的代码。

## 2. 官方规格参数

| 参数 | 规格 |
|------|------|
| 产品型号 | MOONDROP Space Travel |
| 蓝牙版本 | 5.3 |
| 支持协议 | AAC / SBC |
| 编解码协议 | A2DP / AVRCP / HFP / HSP / SBC / AAC |
| 工作距离 | 10米(无障碍空旷环境) |
| 电池续航 | 约4小时(耳机) / 约12小时(充电仓) |

## 3. 连接架构

### 3.1 支持的蓝牙芯片平台
从反编译代码中发现以下芯片平台支持：
- **Qualcomm** (主协议栈) - 使用 GAIA 协议
- **Airoha** - 使用 SPP/BLE 直连
- **Jieli (杰理)** - 蓝牙芯片
- **Conexant (科胜讯)** - 蓝牙芯片
- **Bluetrum (中科蓝讯)** - 蓝牙芯片

### 3.2 连接方式
```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Flutter   │◄───►│  Android Native │◄───►│  蓝牙芯片    │
│   (UI层)    │     │  (MethodChannel)│     │  (耳机端)    │
└─────────────┘     └─────────────────┘     └──────────────┘
```

## 4. Space Travel 实际支持的功能

### 4.1 蓝牙连接管理 ✅

#### Flutter API 接口
```dart
// 扫描设备
"scanDeviceBT" - 开始扫描蓝牙设备
"scanDeviceBTConnected" - 扫描已连接设备

// 连接管理
"connectDeviceBT" - 连接设备
"disconnectGaiaService" - 断开连接
"checkBT" - 检查蓝牙状态
"openBT" - 打开蓝牙

// 状态查询
"getConnectState" - 获取连接状态
"getScanResultBT" - 获取扫描结果
"observerConnectState" - 监听连接状态变化
```

### 4.2 均衡器 (EQ) ✅

#### EQ 接口
```dart
"getEQState" / "getSyncEQState" - 获取 EQ 状态
"setEQ" - 设置预设 EQ
"getPEQ" / "sendGetPEQ" - 获取参数 EQ
"setPEQ" - 设置参数 EQ
"getSyncSelectSet" - 获取选中的 EQ 集合
"setBluetrumPEQ" - 设置 Bluetrum 芯片 EQ
```

#### PEQ 参数
```dart
{
  "bandCount": 10,      // 频段数量
  "freq": 1000,         // 频率 (Hz)
  "gain": 0.0,          // 增益 (dB)
  "q": 0.7,             // Q值
  "type": 0             // 滤波器类型
}
```

### 4.3 触控操作 ✅

#### V2 触控接口
```dart
"getCurrentActionV2" / "sendGetCurrentActionV2" - 获取当前动作
"getDefaultActionV2" / "sendGetDefaultActionV2" - 获取默认动作
"setActionV2" - 设置动作
```

#### 触控动作参数
```dart
{
  "singleL": 0,      // 左耳单击
  "singleR": 0,      // 右耳单击
  "doubleL": 0,       // 左耳双击
  "doubleR": 0,       // 右耳双击
  "tripleL": 0,       // 左耳三击
  "tripleR": 0,       // 右耳三击
  "onesL": 0,         // 左耳长按
  "onesR": 0,         // 右耳长按
  "threesL": 0,       // 左耳滑动
  "threesR": 0        // 右耳滑动
}
```

### 4.4 设备信息 ✅

#### 基本信息接口
```dart
"getBatteryLevel" - 获取电池电量
"getBtAddress" / "sendGetBtAddress" - 获取蓝牙地址
"getEarbudSN" / "sendGetEarbudSN" - 获取序列号
```

### 4.5 Airoha 芯片专用接口 ✅

```dart
"airohaConnectBT" - Airoha 芯片连接
"airohaSetPeq" - 设置 PEQ
"airohaGetOtaVersion" - 获取 OTA 版本
"airohaStartFota" - 开始固件升级
"airohaApplyNewFirmware" - 应用新固件
```

### 4.6 OTA 固件升级 ✅

```dart
"getOTAVersion" / "sendGetOTAVersion" - 获取 OTA 版本
```

## 5. Space Travel 不支持的功能 (APP代码中存在)

> ⚠️ 以下功能在代码中存在，但 Space Travel 硬件不支持

### 5.1 主动降噪 (ANC) ⚠️ 不支持

#### ANC V1 接口
```dart
"getANCMode" / "sendGetANCMode" - 获取 ANC 模式
"setANCMode" - 设置 ANC 模式
"getANCAction" / "sendGetANCAction" - 获取 ANC 动作
"setANCAction" - 设置 ANC 动作
```

#### ANC V2 接口（新版）
```dart
"getAncV2Mode" - 获取 V2 ANC 模式
"setAncV2Mode" - 设置 V2 ANC 模式
"getAncV2SwitchConf" - 获取切换配置
"setAncV2SwitchConf" - 设置切换配置
"registerAncV2Notification" - 注册通知
"ancV2Diagnostic" - 诊断信息
```

#### ANC 模式定义
```java
MODE_ANC_OFF = 0      // ANC 关闭
MODE_ANC_ON = 1       // ANC 开启
MODE_TRANSPARENT = 2   // 通透模式
MODE_ANTI_WIND = 3     // 抗风噪模式
MODE_ADAPTIVE = 4      // 自适应模式
MODE_LIVE = 5          // 现场模式
```

### 5.2 空间音频 ⚠️ 不支持

```dart
"getSpatialAudioState" - 获取空间音频状态
"setSpatialAudioState" - 设置空间音频
"getHeadTrackingState" - 获取头部追踪状态
"setHeadTrackingState" - 设置头部追踪
```

### 5.3 高级编解码器 ⚠️ 不支持

Space Travel 仅支持 SBC/AAC，不支持以下编解码器：

```dart
"GetLdacState" / "sendGetLdacState" - LDAC 状态 ⚠️
"GetLhdcState" / "sendGetLhdcState" - LHDC 状态 ⚠️
"GetLc3State" / "sendGetLc3State" - LC3 状态 ⚠️
"SetLdacState" - 设置 LDAC ⚠️
"SetLhdcState" - 设置 LHDC ⚠️
"SetLc3State" - 设置 LC3 ⚠️
```

### 5.4 其他不支持的功能 ⚠️

```dart
"GetDybassState" / "SetDybassState" - DyBass 低音增强 ⚠️
"getCurrentActionV3" / "setActionV3" - 触控 V3 ⚠️
"GetSensorState" / "SetSensorState" - 传感器 ⚠️
"GetOneBringTwoState" / "SetOneBringTwoState" - 一拖二 ⚠️
"GetLedState" / "SetLedState" - LED 控制 ⚠️
"getIfLrChannelReversed" - 左右声道反转 ⚠️
"getVoiceIndex" / "setVoiceConf" - 语音助手配置 ⚠️
```

## 6. 蓝牙通信流程

### 6.1 连接流程
```
1. Flutter 调用 "scanDeviceBT" 扫描设备
2. 返回设备列表 (name, address, transportType)
3. Flutter 选择设备调用 "connectDeviceBT"
4. Android Native 通过 GAIA 协议建立连接
5. 连接成功后回调 "syncConnectState"
6. 可开始发送功能指令
```

### 6.2 数据交互流程
```
Flutter → MethodChannel → Android Native → GAIA Protocol → 耳机芯片
    ↓                                                              ↓
    ← MethodChannel ← Android Native ← GAIA Protocol ← 耳机芯片
```

## 7. 关键类说明

### 7.1 Handler 类
| 类名 | 功能 | Space Travel 支持 |
|------|------|-------------------|
| BluetoothConnectionHandler | 蓝牙连接管理 | ✅ |
| AncHandler | ANC V1 控制 | ⚠️ 不支持 |
| AncV2Handler | ANC V2 控制 | ⚠️ 不支持 |
| EqHandler | EQ 控制 | ✅ |
| DeviceInfoHandler | 设备信息管理 | ✅ |
| AirohaHandler | Airoha 芯片控制 | ✅ |
| BluetrumFotaHandler | Bluetrum 固件升级 | ✅ |
| JieliFotaHandler | Jieli 固件升级 | ✅ |
| WNOtaHandler | WN OTA 升级 | ✅ |
| UsbDeviceHandler | USB 设备控制 | ✅ |
| CronetHandler | 网络请求 | ✅ |

### 7.2 Repository 类
| 类名 | 功能 | Space Travel 支持 |
|------|------|-------------------|
| ConnectionRepository | 连接状态管理 | ✅ |
| DiscoveryRepository | 设备发现 | ✅ |
| AudioCurationRepository | 音频处理/ANC | ⚠️ ANC部分不支持 |
| MusicProcessingRepository | 音乐处理/EQ | ✅ |
| BatteryRepository | 电池信息 | ✅ |
| CodecRepository | 编解码器 | ⚠️ 仅SBC/AAC |
| TouchV2Repository | 触控 V2 | ✅ |
| TouchV3Repository | 触控 V3 | ⚠️ 不支持 |
| SpatialAudioRepository | 空间音频 | ⚠️ 不支持 |
| LedRepository | LED 控制 | ⚠️ 不支持 |
| VoiceRepository | 语音助手 | ⚠️ 不支持 |

## 8. 权限要求

```xml
<uses-permission android:name="android.permission.BLUETOOTH"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"/>
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
```

## 9. 总结

### Space Travel 实际支持的功能
- ✅ 蓝牙 5.3 连接
- ✅ SBC / AAC 编解码
- ✅ A2DP / AVRCP / HFP / HSP 协议
- ✅ 参数 EQ 调节
- ✅ 触控操作自定义
- ✅ OTA 固件升级
- ✅ 电池电量查询

### Space Travel 不支持的功能
- ⚠️ 主动降噪 (ANC)
- ⚠️ 通透模式
- ⚠️ 空间音频
- ⚠️ LDAC / LHDC / LC3 编解码
- ⚠️ DyBass 低音增强
- ⚠️ 一拖二
- ⚠️ LED 控制
- ⚠️ 传感器

**注意**: 以上不支持的功能在 APP 代码中存在，是因为 MOONDROP Link 是通用APP，支持水月雨全系TWS耳机产品。
