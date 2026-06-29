// Frida script to hook MOONDROP app Bluetooth communication
// Intercepts RFCOMM socket operations and GAIA protocol data

Java.perform(function() {
    console.log("[*] MOONDROP Bluetooth Hook Started");

    // Hook BluetoothSocket.connect()
    var BluetoothSocket = Java.use("android.bluetooth.BluetoothSocket");
    BluetoothSocket.connect.implementation = function() {
        console.log("\n[CONNECT] BluetoothSocket.connect()");
        try { console.log("  Address: " + this.getAddress()); } catch(e) {}
        try { console.log("  Channel: " + this.getChannel()); } catch(e) {}
        try { console.log("  Type: " + this.getType()); } catch(e) {}
        return this.connect();
    };

    // Hook OutputStream.write() to capture outgoing data
    var OutputStream = Java.use("java.io.OutputStream");
    OutputStream.write.overload("[B").implementation = function(bytes) {
        var hexStr = bytesToHex(bytes);
        console.log("\n[SEND] OutputStream.write() - " + bytes.length + " bytes");
        console.log("  Hex: " + hexStr);
        console.log("  GAIA: " + parseGaiaPacket(bytes));
        return this.write(bytes);
    };

    OutputStream.write.overload("[B", "int", "int").implementation = function(bytes, offset, length) {
        var subBytes = bytes.slice(offset, offset + length);
        var hexStr = bytesToHex(subBytes);
        console.log("\n[SEND] OutputStream.write(offset=" + offset + ", len=" + length + ")");
        console.log("  Hex: " + hexStr);
        console.log("  GAIA: " + parseGaiaPacket(subBytes));
        return this.write(bytes, offset, length);
    };

    // Hook InputStream.read() to capture incoming data
    var InputStream = Java.use("java.io.InputStream");
    InputStream.read.overload("[B").implementation = function(buffer) {
        var result = this.read(buffer);
        if (result > 0) {
            var data = new Uint8Array(result);
            for (var i = 0; i < result; i++) {
                data[i] = buffer[i] & 0xFF;
            }
            var hexStr = bytesToHex(data);
            console.log("\n[RECV] InputStream.read() - " + result + " bytes");
            console.log("  Hex: " + hexStr);
            console.log("  GAIA: " + parseGaiaPacket(data));
        }
        return result;
    };

    InputStream.read.overload("[B", "int", "int").implementation = function(buffer, offset, length) {
        var result = this.read(buffer, offset, length);
        if (result > 0) {
            var data = new Uint8Array(result);
            for (var i = 0; i < result; i++) {
                data[i] = buffer[offset + i] & 0xFF;
            }
            var hexStr = bytesToHex(data);
            console.log("\n[RECV] InputStream.read(offset=" + offset + ", len=" + length + ") - " + result + " bytes");
            console.log("  Hex: " + hexStr);
            console.log("  GAIA: " + parseGaiaPacket(data));
        }
        return result;
    };

    // Hook BluetoothGatt for BLE communication
    try {
        var BluetoothGatt = Java.use("android.bluetooth.BluetoothGatt");
        BluetoothGatt.writeCharacteristic.implementation = function(characteristic) {
            console.log("\n[BLE] writeCharacteristic: " + characteristic.getUuid());
            var value = characteristic.getValue();
            if (value != null) {
                var data = new Uint8Array(value.length);
                for (var i = 0; i < value.length; i++) {
                    data[i] = value[i] & 0xFF;
                }
                console.log("  Value: " + bytesToHex(data));
                console.log("  GAIA: " + parseGaiaPacket(data));
            }
            return this.writeCharacteristic(characteristic);
        };
    } catch(e) {
        console.log("[*] BluetoothGatt hook failed: " + e.message);
    }

    // Helper: Convert bytes to hex string
    function bytesToHex(bytes) {
        if (bytes == null) return "null";
        var hex = [];
        for (var i = 0; i < bytes.length; i++) {
            var b = bytes[i] & 0xFF;
            hex.push(("0" + b.toString(16)).slice(-2));
        }
        return hex.join(" ");
    }

    // Helper: Parse GAIA packet
    function parseGaiaPacket(bytes) {
        if (bytes == null || bytes.length < 4) return "Not GAIA";

        try {
            var vendorId = (bytes[0] & 0xFF) | ((bytes[1] & 0xFF) << 8);
            var cmdVal = (bytes[2] & 0xFF) | ((bytes[3] & 0xFF) << 8);

            var feature = (cmdVal >> 9) & 0x7F;
            var pktType = (cmdVal >> 7) & 0x03;
            var command = cmdVal & 0x7F;

            var typeStr = ["COMMAND", "NOTIFICATION", "RESPONSE", "ERROR"][pktType];

            var payload = "";
            if (bytes.length > 4) {
                var payloadBytes = bytes.slice(4);
                payload = " payload=" + bytesToHex(payloadBytes);

                // Special handling for version strings
                if (feature == 1 && command == 5) {
                    var str = "";
                    for (var i = 0; i < payloadBytes.length; i++) {
                        if (payloadBytes[i] >= 32 && payloadBytes[i] < 127) {
                            str += String.fromCharCode(payloadBytes[i]);
                        }
                    }
                    if (str.length > 0) payload += " (version=\"" + str + "\")";
                }
            }

            return "Vendor=" + vendorId + " Feature=" + feature + " Type=" + typeStr + " Cmd=" + command + payload;
        } catch (e) {
            return "Parse error: " + e.message;
        }
    }

    console.log("[*] Hooks installed successfully");
    console.log("[*] Waiting for Bluetooth communication...");
});
