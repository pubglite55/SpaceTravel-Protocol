# 水月雨 MOONDROP Space Travel 太空漫游 蓝牙协议分析

**水月雨 MOONDROP** | **Space Travel 太空漫游** | **TWS真无线耳机**

基于逆向工程分析 **水月雨 MOONDROP Space Travel 太空漫游** TWS 真无线耳机的蓝牙通信协议。

## 项目概述

本项目通过反编译 **水月雨官方 MOONDROP Link APP**、抓包分析、Frida Hook 等手段，完整分析了 **MOONDROP Space Travel 太空漫游** 耳机的蓝牙连接协议和通信机制。

> **官方产品页面**: https://moondroplab.com/cn/products/space-travel

### 核心发现

- **通信协议**: GAIA V3 (Qualcomm Generic Audio Interface Architecture)
- **传输层**: RFCOMM Channel 16, MTU 990 bytes
- **Vendor ID**: 29 (0x001D)
- **验证机制**: SDP 服务发现 + Android 蓝牙权限验证

## 目录结构

```
SpaceTravel-Protocol/
├── README.md                          # 本文件
├── docs/                              # 文档
│   ├── Space_Travel_连接协议分析.md    # 协议概述
│   ├── Space_Travel_完整分析报告.md    # 完整分析报告
│   ├── GAIA_完整抓包数据.md            # 实际抓包数据
│   ├── GAIA_协议抓包分析.md            # 协议分析
│   ├── GAIA_认证流程分析.md            # 认证流程分析
│   ├── 协议通信代码示例.md             # 代码示例
│   └── 官方签名证书分析.md             # 签名证书分析
├── scripts/                           # Frida 脚本
│   ├── frida_bluetooth_hook.js        # 蓝牙基础 hook
│   ├── frida_connect_hook.js          # 连接 hook
│   ├── frida_auth_hook.js             # 认证 hook
│   ├── frida_data_hook.js             # 数据 hook
│   └── frida_gaia_hook.js             # GAIA 协议 hook
└── app/                               # 测试 App (Android)
    └── src/main/
        ├── AndroidManifest.xml
        ├── res/layout/activity_main.xml
        └── java/com/moondrop/spacetravel/
            ├── MainActivity.kt
            └── BleService.kt
```

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/pubglite55/SpaceTravel-Protocol.git
cd SpaceTravel-Protocol
```

### 2. 使用 Frida Hook

#### 安装 Frida

```bash
pip install frida-tools frida
```

#### 下载 frida-server

```bash
# 根据设备架构下载
# https://github.com/frida/frida/releases

# 推送到设备
adb push frida-server /data/local/tmp/
adb shell "chmod 755 /data/local/tmp/frida-server"
adb shell "/data/local/tmp/frida-server &"
```

#### 运行 Hook

```bash
# 启动 MOONDROP APP
adb shell am start -n com.moondroplab.moondrop.moondrop_app/.MainActivity

# 获取进程 PID
frida-ps -U | grep MOONDROP

# 运行 GAIA 数据 hook
frida -U -p <PID> -l scripts/frida_data_hook.js
```

### 3. 构建测试 App

```bash
cd app
./gradlew assembleDebug

# 安装到设备
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## GAIA 协议详解

### 数据包格式

#### 命令包 (手机 → 耳机)

```
字节0-1: [0xFF, 0x04] 包头
字节2-3: [类型, 序列号]
字节4:   [0x00]
字节5-6: Vendor ID (0x001D = 29)
字节7:   Feature ID
字节8+:  Command ID + Payload
```

#### 响应包 (耳机 → 手机)

```
字节0: [0x00]
字节1: Vendor ID (29)
字节2: Feature ID
字节3: Command ID (带类型位)
字节4+: Payload
```

### Feature ID 映射

| Feature | 十进制 | 功能 |
|---------|--------|------|
| 0x00 | 0 | 设备管理 |
| 0x01 | 1 | 基础功能 |
| 0x03 | 3 | ANC V2 |
| 0x07 | 7 | EQ/音乐处理 |
| 0x0A | 10 | 编解码器 |
| 0x0B | 11 | 状态查询 |

### 实际抓包示例

```
# 发送: 查询固件版本
TX: [-1, 4, 0, 0, 0, 29, 0, 5]
     │  │  │  │  │  │     │ └─ Cmd=5 (版本查询)
     │  │  │  │  │  │     └─── Feature=0
     │  │  │  │  │  └───────── Vendor=29
     │  │  │  │  └──────────── 序列号
     │  │  │  └─────────────── 类型
     │  │  └────────────────── 包头
     │  └───────────────────── 长度
     └──────────────────────── 标志

# 接收: 固件版本 "1.0.0"
RX: [0, 29, 1, 5, 49, 46, 48, 46, 48]
     │  │  │  │  └─────────────────── "1.0.0" (ASCII)
     │  │  │  └────────────────────── Cmd=5
     │  │  └───────────────────────── Feature=1
     │  └──────────────────────────── Vendor=29
     └─────────────────────────────── 固定值
```

## 连接失败原因

### 验证机制

```
┌─────────────┐                    ┌─────────────┐
│   手机 APP  │                    │    耳机     │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │  1. RFCOMM 连接请求              │
       │  (带 UUID)                      │
       │ ──────────────────────────────→ │
       │                                  │
       │  2. SDP 服务发现                │
       │  耳机验证 APP 身份              │
       │                                  │
       │  3. 验证通过/失败               │
       │ ←────────────────────────────── │
       │                                  │
```

### 为什么第三方 APP 连不上

1. **SDP 查询拒绝**: 耳机只响应特定 APP 的 SDP 查询
2. **签名验证**: Android 系统级蓝牙签名验证
3. **包名绑定**: 可能只接受 `com.moondroplab.moondrop.moondrop_app`

## 官方签名证书

```
Subject DN: CN=kasuga, OU=moondrop, O=moondroplab, L=chengdu, ST=szechuan, C=CN
Key Algorithm: RSA 2048-bit
SHA-256: d7b972698f528a7994cf6aa814b266564c777f91641568142d11221ff77125b7
```

## 水月雨 MOONDROP Space Travel 太空漫游 硬件规格

| 参数 | 值 |
|------|-----|
| 品牌 | **水月雨 MOONDROP** |
| 产品型号 | **Space Travel 太空漫游** |
| 产品类型 | TWS 真无线耳机 |
| 蓝牙版本 | 5.3 |
| 芯片平台 | Qualcomm |
| 编解码 | SBC / AAC |
| 协议 | A2DP / AVRCP / HFP / HSP |
| 续航 | 耳机 4h / 充电仓 12h |
| 工作距离 | 10米 (无障碍空旷环境) |
| 官方APP | MOONDROP Link |
| 官方网站 | https://moondroplab.com/cn/products/space-travel |

## 参考资料

- [Qualcomm GAIA Protocol](https://www.qualcomm.com/)
- [Android Bluetooth API](https://developer.android.com/develop/connectivity/bluetooth)
- [Frida Documentation](https://frida.re/docs/home/)

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 免责声明

本项目仅用于教育和研究目的。请遵守当地法律法规，尊重知识产权。
