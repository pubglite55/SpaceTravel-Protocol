// Hook GAIA data transmission for authentication analysis
Java.perform(function() {
    console.log("[*] GAIA Data Hook Started\n");

    var hex = function(b) {
        if (!b) return "null";
        var h = [];
        for (var i = 0; i < b.length; i++) h.push(("0" + (b[i] & 0xFF).toString(16)).slice(-2));
        return h.join(" ");
    };

    var gaia = function(b) {
        if (!b || b.length < 4) return "";
        var v = (b[0] & 0xFF) | ((b[1] & 0xFF) << 8);
        var c = (b[2] & 0xFF) | ((b[3] & 0xFF) << 8);
        var feat = (c >> 9) & 0x7F;
        var type = ["CMD","NOTIF","RESP","ERR"][(c >> 7) & 0x03];
        var cmd = c & 0x7F;
        var p = b.length > 4 ? " data=" + hex(b.slice(4)) : "";
        return " V=" + v + " F=" + feat + " " + type + " C=" + cmd + p;
    };

    // ========== SendingThread.sendData ==========
    try {
        var ST = Java.use("com.qualcomm.qti.gaiaclient.core.bluetooth.client.rfcomm.communication.SendingThread");
        ST.sendData.implementation = function(data) {
            var d = [];
            for (var i = 0; i < data.length; i++) d.push(data[i] & 0xFF);
            console.log("\n[TX] sendData: " + data.length + " bytes" + gaia(d));
            console.log("[TX] hex: " + hex(d));
            return this.sendData(data);
        };
        console.log("[OK] SendingThread.sendData hooked");
    } catch(e) { console.log("[!] ST error: " + e); }

    // ========== ReceivingThread.processData ==========
    try {
        var RT = Java.use("com.qualcomm.qti.gaiaclient.core.bluetooth.client.rfcomm.communication.ReceivingThread");
        RT.processData.overload("[B").implementation = function(data) {
            var d = [];
            for (var i = 0; i < data.length; i++) d.push(data[i] & 0xFF);
            console.log("\n[RX] processData: " + data.length + " bytes" + gaia(d));
            console.log("[RX] hex: " + hex(d));
            return this.processData(data);
        };
        console.log("[OK] ReceivingThread.processData hooked");
    } catch(e) { console.log("[!] RT error: " + e); }

    // ========== Communicator.sendData ==========
    try {
        var COM = Java.use("com.qualcomm.qti.gaiaclient.core.bluetooth.client.rfcomm.communication.Communicator");
        COM.sendData.overload("[B").implementation = function(data) {
            var d = [];
            for (var i = 0; i < data.length; i++) d.push(data[i] & 0xFF);
            console.log("\n[COMM-TX] sendData: " + data.length + " bytes" + gaia(d));
            return this.sendData(data);
        };
        console.log("[OK] Communicator.sendData hooked");
    } catch(e) { console.log("[!] COM error: " + e); }

    // ========== GaiaFormatter.format ==========
    try {
        var GF = Java.use("com.qualcomm.qti.gaiaclient.core.gaia.core.transport.GaiaFormatter");
        GF.format.overload("[B").implementation = function(data) {
            var d = [];
            for (var i = 0; i < data.length; i++) d.push(data[i] & 0xFF);
            console.log("[FMT] format: " + hex(d));
            return this.format(data);
        };
        GF.format.overload("[B", "boolean").implementation = function(data, flag) {
            var d = [];
            for (var i = 0; i < data.length; i++) d.push(data[i] & 0xFF);
            console.log("[FMT] format(flag=" + flag + "): " + hex(d));
            return this.format(data, flag);
        };
        console.log("[OK] GaiaFormatter.format hooked");
    } catch(e) { console.log("[!] GF error: " + e); }

    // ========== RfcommClient.connect ==========
    try {
        var RC = Java.use("com.qualcomm.qti.gaiaclient.core.bluetooth.client.rfcomm.RfcommClient");
        RC.connect.overload("com.qualcomm.qti.gaiaclient.core.bluetooth.data.Device").implementation = function(device) {
            console.log("\n[CONNECT] RfcommClient.connect()");
            console.log("[CONNECT] Device: " + device.getAddress() + " (" + device.getName() + ")");
            console.log("[CONNECT] Type: " + device.getType());
            return this.connect(device);
        };
        console.log("[OK] RfcommClient.connect hooked");
    } catch(e) { console.log("[!] RC error: " + e); }

    // ========== ConnectionRequest.run ==========
    try {
        var CR = Java.use("com.qualcomm.qti.gaiaclient.core.requests.qtil.ConnectionRequest");
        CR.run.implementation = function() {
            console.log("\n[CONN-REQ] ConnectionRequest.run()");
            var stack = Java.use("java.lang.Thread").currentThread().getStackTrace();
            for (var i = 2; i < Math.min(stack.length, 10); i++) {
                var s = stack[i].toString();
                if (s.indexOf("gaia") !== -1 || s.indexOf("rfcomm") !== -1 || s.indexOf("bluetooth") !== -1) {
                    console.log("[CONN-REQ]   " + s);
                }
            }
            return this.run();
        };
        console.log("[OK] ConnectionRequest.run hooked");
    } catch(e) { console.log("[!] CR error: " + e); }

    console.log("\n[*] All data hooks installed");
    console.log("[*] Waiting for GAIA communication...\n");
});
