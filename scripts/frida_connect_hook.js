// Hook BluetoothSocket connection establishment
Java.perform(function() {
    console.log("[*] Connection Hook Started");

    try {
        var BluetoothSocket = Java.use("android.bluetooth.BluetoothSocket");

        // Hook connect()
        BluetoothSocket.connect.overload().implementation = function() {
            console.log("\n[CONNECT] BluetoothSocket.connect()");
            try { console.log("  Address: " + this.getAddress()); } catch(e) {}
            try { console.log("  Channel: " + this.getChannel()); } catch(e) {}
            try { console.log("  Type: " + this.getType()); } catch(e) {}

            // Print call stack
            console.log("  Call stack:");
            var stack = Java.use("java.lang.Thread").currentThread().getStackTrace();
            for (var i = 2; i < Math.min(stack.length, 15); i++) {
                console.log("    " + stack[i].toString());
            }

            return this.connect();
        };
        console.log("[*] BluetoothSocket.connect() hooked");
    } catch(e) {
        console.log("[!] BluetoothSocket hook failed: " + e.message);
    }

    try {
        var BluetoothDevice = Java.use("android.bluetooth.BluetoothDevice");

        // Check available methods
        var methods = BluetoothDevice.class.getDeclaredMethods();
        console.log("[*] BluetoothDevice methods containing 'rfcomm':");
        for (var i = 0; i < methods.length; i++) {
            var name = methods[i].getName();
            if (name.toLowerCase().indexOf("rfcomm") !== -1 || name.toLowerCase().indexOf("socket") !== -1) {
                console.log("  " + name);
            }
        }
    } catch(e) {
        console.log("[!] BluetoothDevice enumeration failed: " + e.message);
    }

    console.log("[*] Hooks installed");
});
