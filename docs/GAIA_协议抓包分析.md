# Space Travel GAIA 协议抓包分析

## 抓包时间
2026-06-29 18:41

## 通信方式
- RFCOMM (经典蓝牙串口)
- GAIA V3 协议
- Vendor ID: 29 (0x001D)

## 关键数据包

### 1. 发送数据格式
```
SendingThread: sendData: bytes = [-1, 4, 0, 1, 0, 29, 10, 3, 0]
```
转换为十六进制: `FF 04 00 01 00 1D 0A 03 00`

结构分析:
- `FF 04` - 包头/长度
- `00 01` - 命令类型
- `00` - 序列号
- `1D 0A` - Vendor ID + Feature
- `03 00` - Payload

### 2. 接收的 GAIA 响应

#### Feature 10 (0x0A) - 设备信息类
```
[0, 29, 10, -128, 0]     → Feature=10, Cmd=0 (GET_RESPONSE)
[0, 29, 10, -127, 0]     → Feature=10, Cmd=1
[0, 29, 10, -127, 1]     → Feature=10, Cmd=1 (带数据)
[0, 29, 10, 3, 0]        → Feature=10, Cmd=3
[0, 29, 10, -128, 1]     → Feature=10, Cmd=0 (带数据)
```

#### Feature 11 (0x0B) - 状态查询类
```
[0, 29, 11, 2, 0]        → Feature=11, Cmd=2
[0, 29, 11, 3, 1]        → Feature=11, Cmd=3 (返回1=成功)
```

#### Feature 1 (0x01) - 基础功能
```
[0, 29, 1, 1, 0, 3, 1, 5, 1, 1, 1, 6, 2, 0, 2]
[0, 29, 1, 7]
[0, 29, 1, 0, 3, 1]
```

#### Feature 3 (0x03) - ANC V2
```
[0, 29, 3, 1, 5, 1, 1, 1, 6, 2, 0, 2]
```

#### Feature 5 (0x05) - 固件版本
```
[0, 29, 1, 5, 49, 46, 48, 46, 48]
→ 解码: 49='1', 46='.', 48='0', 46='.', 48='0'
→ 版本: "1.0.0"
```

#### Feature 6 (0x06) - 音频处理
```
[0, 29, 6, -128, 0]
```

### 3. GAIA 数据包格式 (V3)

```
┌──────────┬──────────┬──────────┬─────────────────┐
│ VendorID │ Command  │ PktType  │    Payload      │
│ (2 bytes)│ (2 bytes)│ (在Cmd中)│   (N bytes)     │
└──────────┴──────────┴──────────┴─────────────────┘
```

Command Value 结构:
```
Bit 15-9: Feature ID (7 bits)
Bit 8-7:  Packet Type (2 bits)
Bit 6-0:  Command ID (7 bits)
```

Packet Types:
- 0 = COMMAND
- 1 = NOTIFICATION
- 2 = RESPONSE
- 3 = ERROR

### 4. Feature ID 映射

| Feature | 十进制 | 功能 |
|---------|--------|------|
| 0x01 | 1 | 基础功能 (连接状态等) |
| 0x03 | 3 | ANC V2 |
| 0x05 | 5 | 固件版本 |
| 0x06 | 6 | 音频处理 |
| 0x07 | 7 | EQ/音乐处理 |
| 0x0A | 10 | 设备信息 |
| 0x0B | 11 | 状态查询 |

### 5. 电池查询命令 (推测)

```
发送: [0, 29, 0, 1, 0, 1, 2]
      Vendor=29, Feature=0, Cmd=1, Payload=[1, 2]

响应: [0, 29, 0, 128, 0, left%, right%]
      Vendor=29, Feature=0, Cmd=0, Status=OK, Payload=[左耳%, 右耳%]
```

### 6. EQ 设置命令 (推测)

```
发送: [0, 29, 7, 3, preset_index]
      Vendor=29, Feature=7, Cmd=3, Payload=[预设索引]

响应: [0, 29, 7, 128, 0]
      Vendor=29, Feature=7, Cmd=0, Status=OK
```

## RFCOMM 连接参数

从之前的日志:
```
RFCOMM Connection opened: xx:xx:xx:xx:fc:48 handle:23 scn:16 dlci:33 mtu:990
```

- SCN (Server Channel Number): 16
- MTU: 990 bytes
- DLCI: 33

## 为什么我们的 App 连不上

1. **签名验证**: 耳机可能验证 APP 签名
2. **配对状态**: 需要先通过官方 APP 完成初始配对
3. **RFCOMM 认证**: 可能需要特定的认证流程

## 下一步

1. 使用 Frida hook 官方 APP 的 BluetoothSocket
2. 拦截实际的 RFCOMM 数据
3. 分析认证握手流程
