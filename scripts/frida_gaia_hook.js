// Hook GAIA core classes for authentication analysis
Java.perform(function() {
    console.log("[*] GAIA Core Hook Started\n");

    var hex = function(b) {
        if (!b) return "null";
        var h = [];
        for (var i = 0; i < b.length; i++) h.push(("0" + (b[i] & 0xFF).toString(16)).slice(-2));
        return h.join(" ");
    };

    // ========== RfcommClient ==========
    try {
        var RC = Java.use("com.qualcomm.qti.gaiaclient.core.bluetooth.client.rfcomm.RfcommClient");

        // Hook connect method
        var methods = RC.class.getDeclaredMethods();
        for (var i = 0; i < methods.length; i++) {
            var name = methods[i].getName();
            if (name === "connect" || name === "disconnect" || name === "send") {
                console.log("[FOUND] RfcommClient." + name);
            }
        }
    } catch(e) { console.log("[!] RfcommClient error: " + e); }

    // ========== GaiaSenderWrapper ==========
    try {
        var GSW = Java.use("com.qualcomm.qti.gaiaclient.core.gaia.core.sending.GaiaSenderWrapper");

        GSW.sendData.overload("[B").implementation = function(data) {
            var d = [];
            for (var i = 0; i < data.length; i++) d.push(data[i] & 0xFF);
            console.log("\n[GAIA-SEND] " + data.length + " bytes: " + hex(d));
            return this.sendData(data);
        };

        GSW.sendData.overload("[B", "boolean", "boolean", "java.lang.Object").implementation = function(data, z1, z2, obj) {
            var d = [];
            for (var i = 0; i < data.length; i++) d.push(data[i] & 0xFF);
            console.log("\n[GAIA-SEND] " + data.length + " bytes: " + hex(d));
            return this.sendData(data, z1, z2, obj);
        };

        console.log("[OK] GaiaSenderWrapper hooks installed");
    } catch(e) { console.log("[!] GaiaSenderWrapper error: " + e); }

    // ========== GaiaReader ==========
    try {
        var GR = Java.use("com.qualcomm.qti.gaiaclient.core.gaia.core.transport.GaiaReader");

        // Hook all methods
        var methods = GR.class.getDeclaredMethods();
        for (var i = 0; i < methods.length; i++) {
            var name = methods[i].getName();
            if (name.indexOf("read") !== -1 || name.indexOf("parse") !== -1 || name.indexOf("receive") !== -1) {
                console.log("[FOUND] GaiaReader." + name);
            }
        }
    } catch(e) { console.log("[!] GaiaReader error: " + e); }

    // ========== SendingThread ==========
    try {
        var ST = Java.use("com.qualcomm.qti.gaiaclient.core.bluetooth.client.rfcomm.communication.SendingThread");

        var methods = ST.class.getDeclaredMethods();
        for (var i = 0; i < methods.length; i++) {
            console.log("[FOUND] SendingThread." + methods[i].getName());
        }
    } catch(e) { console.log("[!] SendingThread error: " + e); }

    // ========== ReceivingThread ==========
    try {
        var RT = Java.use("com.qualcomm.qti.gaiaclient.core.bluetooth.client.rfcomm.communication.ReceivingThread");

        var methods = RT.class.getDeclaredMethods();
        for (var i = 0; i < methods.length; i++) {
            console.log("[FOUND] ReceivingThread." + methods[i].getName());
        }
    } catch(e) { console.log("[!] ReceivingThread error: " + e); }

    // ========== Communicator ==========
    try {
        var COM = Java.use("com.qualcomm.qti.gaiaclient.core.bluetooth.client.rfcomm.communication.Communicator");

        var methods = COM.class.getDeclaredMethods();
        for (var i = 0; i < methods.length; i++) {
            console.log("[FOUND] Communicator." + methods[i].getName());
        }
    } catch(e) { console.log("[!] Communicator error: " + e); }

    // ========== GaiaFormatter ==========
    try {
        var GF = Java.use("com.qualcomm.qti.gaiaclient.core.gaia.core.transport.GaiaFormatter");

        var methods = GF.class.getDeclaredMethods();
        for (var i = 0; i < methods.length; i++) {
            var name = methods[i].getName();
            if (name.indexOf("format") !== -1 || name.indexOf("build") !== -1) {
                console.log("[FOUND] GaiaFormatter." + name);
            }
        }
    } catch(e) { console.log("[!] GaiaFormatter error: " + e); }

    // ========== ConnectionRequest ==========
    try {
        var CR = Java.use("com.qualcomm.qti.gaiaclient.core.requests.qtil.ConnectionRequest");

        var methods = CR.class.getDeclaredMethods();
        for (var i = 0; i < methods.length; i++) {
            console.log("[FOUND] ConnectionRequest." + methods[i].getName());
        }
    } catch(e) { console.log("[!] ConnectionRequest error: " + e); }

    console.log("\n[*] GAIA hooks installed. Waiting for data...\n");
});
