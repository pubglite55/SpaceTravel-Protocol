# Moondrop Space Travel 蓝牙连接工具

基于反编译 MOONDROP Link APP 实现的 Space Travel 耳机蓝牙连接代码。

## 文件说明

| 文件 | 说明 |
|------|------|
| `space_travel_ble.py` | 完整 BLE 连接类，包含所有命令 |
| `space_travel_gaia.py` | GAIA 协议实现，带响应等待 |
| `space_travel_connect.py` | 快速连接测试脚本 |

## 安装依赖

```bash
pip3 install bleak
```

## 使用方法

### 1. 快速测试连接

```bash
python3 space_travel_connect.py
```

### 2. 使用完整连接类

```python
import asyncio
from space_travel_ble import SpaceTravelBLE

async def main():
    travel = SpaceTravelBLE()

    # 扫描设备
    devices = await travel.scan(timeout=10.0)

    if devices:
        # 连接第一个设备
        await travel.connect(devices[0]["address"], devices[0]["name"])

        # 获取电池
        await travel.get_battery_levels()

        # 获取 EQ
        await travel.get_eq_state()

        # 保持连接
        await asyncio.sleep(60)

        await travel.disconnect()

asyncio.run(main())
```

### 3. 使用 GAIA 协议

```python
import asyncio
from space_travel_gaia import SpaceTravelConnection

async def main():
    conn = SpaceTravelConnection()

    # 扫描并连接
    devices = await conn.scan()
    if devices:
        await conn.connect(devices[0]["address"])

        # 获取电池
        battery = await conn.get_battery()
        print(f"电池: {battery}")

        # 设置 EQ
        await conn.set_eq_preset(0)

        await conn.disconnect()

asyncio.run(main())
```

## 支持的命令

### 电池 (Feature: 0)
- `GET_SUPPORTED_BATTERIES` - 获取支持的电池类型
- `GET_BATTERY_LEVELS` - 获取电池电量

### EQ (Feature: 7)
- `GET_STATE` - 获取 EQ 状态
- `GET_AVAILABLE_PRESETS` - 获取可用预设
- `SET_SELECTED_SET` - 设置预设
- `GET_USER_CONFIG` - 获取用户配置
- `SET_USER_CONFIG` - 设置用户配置

### 触控 (Feature: 8)
- `SET_CURRENT_ACTION` - 设置触控动作

## 注意事项

1. **BLE UUIDs**: 脚本中的 UUID 是通用值，实际设备可能不同。连接后请查看设备提供的服务列表。

2. **权限**: macOS 需要在系统偏好设置中允许终端访问蓝牙。

3. **设备状态**: 耳机需要处于配对模式或已配对状态。

## 协议说明

Space Travel 使用 GAIA V3 协议:
- Vendor ID: 0x001D (Qualcomm QTIL)
- 数据包格式: [VendorID:2B] [Command:2B] [Payload:NB]
- Command 结构: [Feature:7bit] [Type:2bit] [Cmd:7bit]
