package com.augmentos.asg_client;

import android.annotation.SuppressLint;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.wifi.WifiConfiguration;
import android.net.wifi.WifiManager;
import android.net.wifi.WifiNetworkSuggestion;
import android.os.Build;
import android.util.Log;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;
import java.util.List;

/**
 * A helper class that encapsulates:
 *  - Starting/stopping a Wi-Fi hotspot (placeholder - actual code requires system/privileged APIs)
 *  - Spinning up a minimal local HTTP server to accept Wi-Fi credentials
 *  - Connecting to Wi-Fi (legacy method on Android < Q, or modern approach on Q+)
 *
 *  Use the {@link NetworkSetupCallback} to receive notifications when credentials arrive
 *  and when Wi-Fi connection attempts succeed/fail, so your service can react accordingly.
 */
public class NetworkSetupManager {

    private static final String TAG = "NetworkSetupManager";

    private final Context context;
    private final WifiManager wifiManager;
    private final NetworkSetupCallback callback;
    private BroadcastReceiver wifiSuggestionReceiver;


    // Simple flags
    private boolean isHotspotEnabled = false;
    private boolean isServerRunning = false;

    // Thread and port for our minimal HTTP server
    private Thread serverThread;
    private int listenPort = 8080;  // Use any open port; can be changed if needed

    /**
     * Constructor requires:
     *  1) A Context (preferably getApplicationContext() to avoid leaks)
     *  2) A callback for events (e.g. credentials received, Wi-Fi success/failure)
     */
    public NetworkSetupManager(Context context, NetworkSetupCallback callback) {
        this.context = context.getApplicationContext();
        this.callback = callback;
        this.wifiManager = (WifiManager) this.context.getSystemService(Context.WIFI_SERVICE);
    }

    /**
     * Start the Wi-Fi hotspot (AP mode).
     * NOTE: This is a placeholder – real hotspot toggling requires hidden / privileged APIs.
     */
    public void startHotspot() {
        Log.d(TAG, "startHotspot invoked");
        if (!isHotspotEnabled) {
            boolean success = enableHotspotInternal();
            if (success) {
                isHotspotEnabled = true;
                Log.d(TAG, "Hotspot started successfully (placeholder).");
                callback.onHotspotStarted();
            } else {
                Log.e(TAG, "Failed to enable hotspot (placeholder).");
                // In real code, you'd handle errors or retries
            }
        } else {
            Log.d(TAG, "Hotspot is already enabled, doing nothing.");
        }
    }

    /**
     * Stop the Wi-Fi hotspot (AP mode).
     * NOTE: This is a placeholder – real hotspot toggling requires hidden / privileged APIs.
     */
    public void stopHotspot() {
        Log.d(TAG, "stopHotspot invoked");
        if (isHotspotEnabled) {
            boolean success = disableHotspotInternal();
            if (success) {
                isHotspotEnabled = false;
                Log.d(TAG, "Hotspot stopped successfully (placeholder).");
                callback.onHotspotStopped();
            } else {
                Log.e(TAG, "Failed to disable hotspot (placeholder).");
            }
        } else {
            Log.d(TAG, "Hotspot is not active, so nothing to stop.");
        }
    }

    /**
     * Start a minimal HTTP server to listen for Wi-Fi credentials + optional auth token.
     * For real usage, consider NanoHTTPD or another robust library with HTTPS support.
     */
    public void startServer(int port) {
        if (isServerRunning) {
            Log.d(TAG, "Server already running on port " + listenPort);
            return;
        }

        this.listenPort = port;
        serverThread = new Thread(() -> runServer(listenPort));
        serverThread.start();
    }

    /**
     * Overload for convenience if you want a default port.
     */
    public void startServer() {
        startServer(listenPort);  // use the existing or default port
    }

    /**
     * Stop the HTTP server if it's running.
     */
    public void stopServer() {
        if (!isServerRunning) {
            Log.d(TAG, "Server not running, so nothing to stop.");
            return;
        }
        isServerRunning = false; // signaling the thread to close
        // The actual socket close is done in runServer()
        Log.d(TAG, "stopServer requested; server will shut down soon.");
        callback.onServerStopped();
    }

    /**
     * Attempt to connect to the specified Wi-Fi network using either:
     *  - Legacy (WifiConfiguration + addNetwork) on Android < Q
     *  - Suggestions or hidden APIs on Q+ (depending on your system privileges).
     */
    public void connectToWifi(String ssid, String password) {
        Log.d(TAG, "connectToWifi -> SSID: " + ssid);

        // Optionally disable the hotspot here if concurrency isn't supported:
        if (isHotspotEnabled) {
            Log.d(TAG, "Disabling hotspot before connecting to Wi-Fi.");
            stopHotspot();
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            connectWifiLegacy(ssid, password);
        } else {
            connectWifiModern(ssid, password);
        }
    }

    // ----------------------------------------------------------------------------------------
    // HELPER METHODS
    // ----------------------------------------------------------------------------------------

    /**
     * This uses the older WifiConfiguration approach (Android 9 and below).
     * In a normal user app, you might need user permissions or run into constraints.
     * If you're a system app on a custom device, you can still do this on Q+.
     */
    @SuppressLint("MissingPermission")
    private void connectWifiLegacy(String ssid, String password) {
        Log.d(TAG, "connectWifiLegacy called");

        // Turn off Wi-Fi first if needed
        if (!wifiManager.isWifiEnabled()) {
            wifiManager.setWifiEnabled(true);
        }

        // Create the WifiConfiguration
        WifiConfiguration config = new WifiConfiguration();
        config.SSID = "\"" + ssid + "\"";
        config.preSharedKey = "\"" + password + "\"";
        config.hiddenSSID = true;
        config.status = WifiConfiguration.Status.ENABLED;
        config.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.WPA_PSK);

        int netId = wifiManager.addNetwork(config);
        if (netId == -1) {
            Log.e(TAG, "Failed to add network configuration for SSID: " + ssid);
            callback.onWifiConnectionFailure();
            return;
        }
        // Enable and connect
        boolean enabled = wifiManager.enableNetwork(netId, true);
        boolean reassociate = wifiManager.reassociate();

        Log.d(TAG, "enableNetwork returned: " + enabled + ", reassociate: " + reassociate);

        // In real code, you might want to wait for a broadcast that confirms connection
        // or poll connectivity in a background thread. For simplicity:
        if (enabled) {
            // Give the system a moment to connect, or register a BroadcastReceiver for WIFI_STATE, etc.
            try {
                Thread.sleep(2000);
            } catch (InterruptedException ignore) {}

            // Check if we are truly connected:
            if (isConnectedToWifi()) {
                callback.onWifiConnectionSuccess();
            } else {
                callback.onWifiConnectionFailure();
            }
        } else {
            callback.onWifiConnectionFailure();
        }
    }

    /**
     * Modern approach for Android 10 (Q) and up. Requires either user approvals
     * or privileged app status to skip user prompts. This is a placeholder method:
     * you'll typically use WifiNetworkSuggestion or hidden system APIs.
     */
    public void connectWifiModern(String ssid, String password) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return;
        Log.d(TAG, "connectWifiModern called (Q+).");

        // Clean up old suggestions if needed, or if you want to ensure a fresh start:
        // removeExistingSuggestions();

        // Build the suggestion
        WifiNetworkSuggestion suggestion =
                new WifiNetworkSuggestion.Builder()
                        .setSsid(ssid)
                        .setWpa2Passphrase(password)
                        // .setIsAppInteractionRequired(false) // set this to false if you want a silent attempt
                        .setIsAppInteractionRequired(true)
                        .build();

        // Add to a list
        List<WifiNetworkSuggestion> suggestionsList = new ArrayList<>();
        suggestionsList.add(suggestion);

        // Add the suggestions to the WifiManager
        int status = 0;
        status = wifiManager.addNetworkSuggestions(suggestionsList);
        if (status != WifiManager.STATUS_NETWORK_SUGGESTIONS_SUCCESS) {
            // Failed to add suggestions
            Log.e(TAG, "Failed to add network suggestions, status=" + status);
            callback.onWifiConnectionFailure();
            return;
        }

        // Register a broadcast receiver to listen for the post-connection broadcast
        // You should register/unregister this receiver in an Activity/Service that has lifecycle control
        // to avoid memory leaks.
        registerPostConnectionReceiver();

        // For demonstration, you might do a time-based check or rely exclusively on the broadcast
        // to confirm connection. Below is a naive approach:
        new Thread(() -> {
            try {
                // Wait a bit for OS to connect.
                Thread.sleep(5000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            if (isConnectedToWifi()) {
                callback.onWifiConnectionSuccess();
            } else {
                // The broadcast might still come if the OS is still working on the connection,
                // but let's do a fallback here.
                callback.onWifiConnectionFailure();
            }
        }).start();
    }

    private void registerPostConnectionReceiver() {
        if (wifiSuggestionReceiver != null) {
            // Already registered
            return;
        }

        wifiSuggestionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (WifiManager.ACTION_WIFI_NETWORK_SUGGESTION_POST_CONNECTION.equals(intent.getAction())) {
                    // A suggestion connection is complete
                    Log.d(TAG, "Received WIFI_NETWORK_SUGGESTION_POST_CONNECTION broadcast");
                    // If desired, confirm that it's the correct SSID, etc.
                    // This broadcast just indicates *some* suggested network was connected.
                    callback.onWifiConnectionSuccess();
                }
            }
        };

        IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(WifiManager.ACTION_WIFI_NETWORK_SUGGESTION_POST_CONNECTION);
        this.context.registerReceiver(wifiSuggestionReceiver, intentFilter);
    }

    /**
     * Unregister the suggestion broadcast receiver.
     * Call this when you no longer need to listen, or on Destroy for your Activity/Service.
     */
    public void unregisterPostConnectionReceiver() {
        if (wifiSuggestionReceiver != null) {
            context.unregisterReceiver(wifiSuggestionReceiver);
            wifiSuggestionReceiver = null;
        }
    }

    /**
     * Optionally remove existing suggestions if you want a fresh slate.
     */
    private void removeExistingSuggestions() {
        // If you want to remove all suggestions your app has added in the past:
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return;
            wifiManager.removeNetworkSuggestions(new ArrayList<>());
        // Or remove a specific set of suggestions by building them similarly to how you added them.
    }
    /**
     * Returns true if we're currently on a Wi-Fi network.
     */
    private boolean isConnectedToWifi() {
        ConnectivityManager cm = (ConnectivityManager)
                context.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        Network network = cm.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities caps = cm.getNetworkCapabilities(network);
        return (caps != null && caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI));
    }

    /**
     * Minimal placeholder method for enabling the hotspot using hidden/system APIs.
     * If you are a system/priv‐app, you might reflect into WifiManager or use an OEM-provided API.
     */
    @SuppressWarnings({"JavaReflectionMemberAccess", "unchecked"})
    private boolean enableHotspotInternal() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ approach using TetheringManager
//                TetheringManager tetheringManager =
//                        (TetheringManager) appContext.getSystemService(Context.TETHERING_SERVICE);
//                if (tetheringManager == null) {
//                    Log.e(TAG, "TetheringManager not available");
//                    return false;
//                }
//
//                // Build a tethering request for Wi-Fi
//                TetheringManager.TetheringRequest request =
//                        new TetheringManager.TetheringRequest.Builder(TetheringManager.TETHERING_WIFI)
//                                .build();
//
//                // Start tethering (asynchronously!)
//                tetheringManager.startTethering(
//                        request,
//                        /* executor = */ new HandlerExecutor(new Handler(Looper.getMainLooper())),
//                        /* callback = */ new TetheringManager.StartTetheringCallback() {
//                            @Override
//                            public void onTetheringStarted() {
//                                Log.d(TAG, "Hotspot started successfully via TetheringManager (API 29+).");
//                                // If you have a callback interface, you could call onHotspotStarted() here
//                            }
//
//                            @Override
//                            public void onTetheringFailed(int error) {
//                                Log.e(TAG, "Failed to start hotspot via TetheringManager. Error=" + error);
//                            }
//                        }
//                );

                // Since it's asynchronous, we'll just return true if we got this far
                Log.d(TAG, "Requested hotspot start via TetheringManager; returning true (async).");
                return true;

            } else {
                // Android 9 and below: Reflection on WifiManager.setWifiApEnabled(...)
                WifiConfiguration apConfig = new WifiConfiguration();
                apConfig.SSID = "MyASGHotspot_" + System.currentTimeMillis();
                //apConfig.preSharedKey = "ASGpassword123";
                apConfig.hiddenSSID = false;
                apConfig.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.NONE);
                // apConfig.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.WPA_PSK);
                // For an open hotspot, you could do:
                // apConfig.allowedKeyManagement.clear();
                // apConfig.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.NONE);

                Class<?> wifiManagerClass = wifiManager.getClass();
                java.lang.reflect.Method setWifiApMethod =
                        wifiManagerClass.getMethod("setWifiApEnabled", WifiConfiguration.class, boolean.class);
                setWifiApMethod.setAccessible(true);

                boolean result = (boolean) setWifiApMethod.invoke(wifiManager, apConfig, true);
                Log.d(TAG, "enableHotspotInternal -> reflection call result: " + result);
                return result;
            }

        } catch (Exception e) {
            Log.e(TAG, "Error enabling hotspot (reflection or TetheringManager)", e);
            return false;
        }
    }



    /**
     * Minimal placeholder method for disabling the hotspot using hidden/system APIs.
     */
    @SuppressWarnings({"JavaReflectionMemberAccess", "unchecked"})
    private boolean disableHotspotInternal() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ approach using TetheringManager
//                TetheringManager tetheringManager =
//                        (TetheringManager) appContext.getSystemService(Context.TETHERING_SERVICE);
//                if (tetheringManager == null) {
//                    Log.e(TAG, "TetheringManager not available");
//                    return false;
//                }
//
//                // Stop tethering (no callback; it's a "fire-and-forget")
//                tetheringManager.stopTethering(TetheringManager.TETHERING_WIFI);
//                Log.d(TAG, "disableHotspotInternal -> Requested stop of hotspot via TetheringManager (API 29+).");

                // TetheringManager.stopTethering() does not return a success/fail result
                // We'll assume success if we got here
                return true;

            } else {
                // Android 9 and below: Reflection on WifiManager.setWifiApEnabled(...)
                // Typically we pass null or reuse the last known WifiConfiguration,
                // plus "false" to disable.
                Class<?> wifiManagerClass = wifiManager.getClass();
                java.lang.reflect.Method setWifiApMethod =
                        wifiManagerClass.getMethod("setWifiApEnabled", WifiConfiguration.class, boolean.class);
                setWifiApMethod.setAccessible(true);

                // Turn off the hotspot
                boolean result = (boolean) setWifiApMethod.invoke(wifiManager, null, false);
                Log.d(TAG, "disableHotspotInternal -> reflection call result: " + result);
                return result;
            }

        } catch (Exception e) {
            Log.e(TAG, "Error disabling hotspot", e);
            return false;
        }
    }



    // ----------------------------------------------------------------------------------------
    // MINIMAL EMBEDDED HTTP SERVER
    // ----------------------------------------------------------------------------------------

    /**
     * A naive blocking server that listens for a POST request containing
     * Wi-Fi credentials & optional auth token in some simple format.
     * (Again, not production-ready.)
     */
    private void runServer(int port) {
        ServerSocket serverSocket = null;

        try {
            serverSocket = new ServerSocket();
            serverSocket.setReuseAddress(true);
            serverSocket.bind(new InetSocketAddress(port));
            isServerRunning = true;
            Log.d(TAG, "Local server started on port: " + port);

            // Notify callback
            callback.onServerStarted(port);

            while (isServerRunning) {
                // Accept blocks until a new connection arrives
                Socket client = serverSocket.accept();
                handleClient(client);
            }

        } catch (IOException e) {
            Log.e(TAG, "Server socket error: ", e);
        } finally {
            if (serverSocket != null) {
                try {
                    serverSocket.close();
                } catch (IOException ignore) {}
            }
            isServerRunning = false;
            Log.d(TAG, "Server socket closed, server thread finishing.");
        }
    }

    /**
     * Handles each client connection in a blocking manner (for demonstration).
     * Expects a trivial POST or GET with Wi-Fi credentials in the query or body:
     *   e.g.  POST /?ssid=MyNetwork&pass=MyPassword&token=SomeAuthToken
     * In real code, parse properly with URLDecoder and handle JSON or form-encoded data.
     */
    private void handleClient(Socket client) {
        BufferedReader reader = null;
        OutputStream out = null;

        try {
            reader = new BufferedReader(new InputStreamReader(client.getInputStream()));
            out = client.getOutputStream();

            // For demonstration, read the first line to see if it includes creds
            // Real code should parse headers, handle chunking, etc.
            String requestLine = reader.readLine();
            Log.d(TAG, "Client requestLine: " + requestLine);

            // Attempt a naive parse:
            // If requestLine is "POST /?ssid=...&pass=...&token=..."
            String ssid = null;
            String pass = null;
            String token = null;

            if (requestLine != null) {
                // Quick hack: find substring after "/?" and parse
                int idx = requestLine.indexOf("/?");
                if (idx != -1) {
                    String query = requestLine.substring(idx + 2); // skip "/?"
                    // But query might contain "HTTP/1.1", so let's just split on space
                    int spaceIdx = query.indexOf(" ");
                    if (spaceIdx != -1) {
                        query = query.substring(0, spaceIdx);
                    }
                    // e.g. query = "ssid=MyNet&pass=Secret&token=XYZ"
                    String[] pairs = query.split("&");
                    for (String p : pairs) {
                        String[] kv = p.split("=");
                        if (kv.length == 2) {
                            String key = kv[0];
                            String val = kv[1];
                            if ("ssid".equalsIgnoreCase(key)) {
                                ssid = val;
                            } else if ("pass".equalsIgnoreCase(key)) {
                                pass = val;
                            } else if ("token".equalsIgnoreCase(key)) {
                                token = val;
                            }
                        }
                    }
                }
            }

            // Construct a minimal HTTP response
            StringBuilder sb = new StringBuilder();
            sb.append("HTTP/1.1 200 OK\r\n");
            sb.append("Content-Type: text/plain\r\n");
            sb.append("Connection: close\r\n");
            sb.append("\r\n");
            if (ssid != null && pass != null) {
                sb.append("Received SSID=" + ssid + ", PASS=" + pass + ", TOKEN=" + token + "\n");
                sb.append("Attempting Wi-Fi connection.\n");
            } else {
                sb.append("No credentials found in request.\n");
            }
            out.write(sb.toString().getBytes());
            out.flush();

            // If we got valid credentials, notify the callback
            if (ssid != null && pass != null) {
                connectToWifi(ssid, pass);

                callback.onCredentialsReceived(ssid, pass, token);
            }

        } catch (Exception e) {
            Log.e(TAG, "Error handling client: ", e);
        } finally {
            try {
                if (reader != null) reader.close();
                if (out != null) out.close();
                client.close();
            } catch (IOException ignore) {}
        }
    }

    // ----------------------------------------------------------------------------------------
    // CALLBACK INTERFACE
    // ----------------------------------------------------------------------------------------

    /**
     * Interface for your Service or Activity to get events:
     *  - onHotspotStarted(), onHotspotStopped()
     *  - onServerStarted(port), onServerStopped()
     *  - onCredentialsReceived(...) (the key event for you to then connect Wi-Fi)
     *  - onWifiConnectionSuccess() / onWifiConnectionFailure()
     */
    public interface NetworkSetupCallback {
        /**
         * Hotspot events
         */
        void onHotspotStarted();
        void onHotspotStopped();

        /**
         * Server events
         */
        void onServerStarted(int port);
        void onServerStopped();

        /**
         * Credentials from the local HTTP server
         */
        void onCredentialsReceived(String ssid, String password, String authToken);

        /**
         * Wi-Fi connection attempt results
         */
        void onWifiConnectionSuccess();
        void onWifiConnectionFailure();
    }
}
