// Comprehensive Frida hook for MOONDROP Bluetooth authentication
// Captures: RFCOMM connection, SDP queries, GAIA handshake, authentication

Java.perform(function() {
    console.log("[*] ========================================");
    console.log("[*] MOONDROP Auth Analysis Hook Started");
    console.log("[*] ========================================\n");

    var hex = function(bytes) {
        if (!bytes) return "null";
        var h = [];
        for (var i = 0; i < bytes.length; i++) {
            h.push(("0" + (bytes[i] & 0xFF).toString(16)).slice(-2));
        }
        return h.join(" ");
    };

    var gaiaInfo = function(bytes) {
        if (!bytes || bytes.length < 4) return "";
        try {
            var v = (bytes[0] & 0xFF) | ((bytes[1] & 0xFF) << 8);
            var c = (bytes[2] & 0xFF) | ((bytes[3] & 0xFF) << 8);
            var feat = (c >> 9) & 0x7F;
            var type = (c >> 7) & 0x03;
            var cmd = c & 0x7F;
            var types = ["CMD","NOTIF","RESP","ERR"];
            var p = bytes.length > 4 ? " data=" + hex(bytes.slice(4)) : "";
            return " Vendor=" + v + " Feat=" + feat + " " + types[type] + " Cmd=" + cmd + p;
        } catch(e) { return ""; }
    };

    // ========== BluetoothSocket ==========
    try {
        var BS = Java.use("android.bluetooth.BluetoothSocket");

        BS.connect.overload().implementation = function() {
            console.log("\n[BT] === Socket.connect() ===");
            try { console.log("[BT]   Address: " + this.getAddress()); } catch(e) {}
            try { console.log("[BT]   Channel: " + this.getChannel()); } catch(e) {}
            try { console.log("[BT]   Type: " + this.getType()); } catch(e) {}
            try { console.log("[BT]   Auth: " + this.getAuth()); } catch(e) {}
            try { console.log("[BT]   Secure: " + this.getSecure()); } catch(e) {}

            var stack = Java.use("java.lang.Thread").currentThread().getStackTrace();
            console.log("[BT]   Stack:");
            for (var i = 2; i < Math.min(stack.length, 20); i++) {
                var s = stack[i].toString();
                if (s.indexOf("moondrop") !== -1 || s.indexOf("bluetooth") !== -1 || s.indexOf("gaia") !== -1 || s.indexOf("rfcomm") !== -1) {
                    console.log("[BT]     " + s);
                }
            }

            var result = this.connect();
            console.log("[BT]   connect() returned: " + result);
            return result;
        };

        BS.close.implementation = function() {
            console.log("[BT] === Socket.close() ===");
            try { console.log("[BT]   Address: " + this.getAddress()); } catch(e) {}
            return this.close();
        };

        console.log("[OK] BluetoothSocket hooks installed");
    } catch(e) { console.log("[!] BluetoothSocket error: " + e); }

    // ========== BluetoothDevice ==========
    try {
        var BD = Java.use("android.bluetooth.BluetoothDevice");

        BD.createRfcommSocketToServiceRecord.implementation = function(uuid) {
            console.log("\n[DEV] === createRfcommSocketToServiceRecord ===");
            console.log("[DEV]   Device: " + this.getAddress() + " (" + this.getName() + ")");
            console.log("[DEV]   UUID: " + uuid.toString());
            return this.createRfcommSocketToServiceRecord(uuid);
        };

        BD.createRfcommSocket.overload("int").implementation = function(channel) {
            console.log("\n[DEV] === createRfcommSocket(channel=" + channel + ") ===");
            console.log("[DEV]   Device: " + this.getAddress() + " (" + this.getName() + ")");
            return this.createRfcommSocket(channel);
        };

        BD.createInsecureRfcommSocketToServiceRecord.implementation = function(uuid) {
            console.log("\n[DEV] === createInsecureRfcommSocketToServiceRecord ===");
            console.log("[DEV]   Device: " + this.getAddress());
            console.log("[DEV]   UUID: " + uuid.toString());
            return this.createInsecureRfcommSocketToServiceRecord(uuid);
        };

        console.log("[OK] BluetoothDevice hooks installed");
    } catch(e) { console.log("[!] BluetoothDevice error: " + e); }

    // ========== InputStream (receive data) ==========
    try {
        var IS = Java.use("java.io.InputStream");

        IS.read.overload("[B").implementation = function(buf) {
            var n = this.read(buf);
            if (n > 0) {
                var d = [];
                for (var i = 0; i < n; i++) d.push(buf[i] & 0xFF);
                console.log("\n[RECV] " + n + " bytes: " + hex(d) + gaiaInfo(d));
            }
            return n;
        };

        IS.read.overload("[B", "int", "int").implementation = function(buf, off, len) {
            var n = this.read(buf, off, len);
            if (n > 0) {
                var d = [];
                for (var i = 0; i < n; i++) d.push(buf[off + i] & 0xFF);
                console.log("\n[RECV] off=" + off + " len=" + len + " got=" + n + " bytes: " + hex(d) + gaiaInfo(d));
            }
            return n;
        };

        console.log("[OK] InputStream hooks installed");
    } catch(e) { console.log("[!] InputStream error: " + e); }

    // ========== OutputStream (send data) ==========
    try {
        var OS = Java.use("java.io.OutputStream");

        OS.write.overload("[B").implementation = function(buf) {
            var d = [];
            for (var i = 0; i < buf.length; i++) d.push(buf[i] & 0xFF);
            console.log("\n[SEND] " + buf.length + " bytes: " + hex(d) + gaiaInfo(d));
            return this.write(buf);
        };

        OS.write.overload("[B", "int", "int").implementation = function(buf, off, len) {
            var d = [];
            for (var i = 0; i < len; i++) d.push(buf[off + i] & 0xFF);
            console.log("\n[SEND] off=" + off + " len=" + len + " bytes: " + hex(d) + gaiaInfo(d));
            return this.write(buf, off, len);
        };

        console.log("[OK] OutputStream hooks installed");
    } catch(e) { console.log("[!] OutputStream error: " + e); }

    // ========== BluetoothGatt (BLE) ==========
    try {
        var BG = Java.use("android.bluetooth.BluetoothGatt");

        BG.connect.overload().implementation = function() {
            console.log("\n[BLE] === Gatt.connect() ===");
            return this.connect();
        };

        BG.discoverServices.implementation = function() {
            console.log("[BLE] === Gatt.discoverServices() ===");
            return this.discoverServices();
        };

        console.log("[OK] BluetoothGatt hooks installed");
    } catch(e) { console.log("[!] BluetoothGatt error: " + e); }

    // ========== BluetoothAdapter ==========
    try {
        var BA = Java.use("android.bluetooth.BluetoothAdapter");

        BA.getRemoteDevice.overload("java.lang.String").implementation = function(addr) {
            console.log("[ADAPTER] getRemoteDevice(" + addr + ")");
            return this.getRemoteDevice(addr);
        };

        console.log("[OK] BluetoothAdapter hooks installed");
    } catch(e) { console.log("[!] BluetoothAdapter error: " + e); }

    // ========== Search for GAIA-related classes ==========
    try {
        Java.enumerateLoadedClasses({
            onMatch: function(className) {
                if (className.toLowerCase().indexOf("gaia") !== -1 ||
                    className.toLowerCase().indexOf("rfcomm") !== -1 ||
                    className.toLowerCase().indexOf("communicat") !== -1) {
                    console.log("[CLASS] " + className);
                }
            },
            onComplete: function() {}
        });
    } catch(e) {}

    console.log("\n[*] All hooks installed. Waiting for Bluetooth activity...");
    console.log("[*] Trigger connection in the app to capture data.\n");
});
