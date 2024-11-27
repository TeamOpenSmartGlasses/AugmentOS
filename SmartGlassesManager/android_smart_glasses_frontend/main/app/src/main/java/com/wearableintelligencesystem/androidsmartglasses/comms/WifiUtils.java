package com.wearableintelligencesystem.androidsmartglasses.comms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.util.Log;

public class WifiUtils {
    public static String TAG = "WearableAiAsg_WifiUtils";

    public static boolean checkWifiOnAndConnected(Context context) {
        WifiManager wifiMgr = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);

        if (wifiMgr.isWifiEnabled()) { // Wi-Fi adapter is ON

            WifiInfo wifiInfo = wifiMgr.getConnectionInfo();

            if( wifiInfo.getNetworkId() == -1 ){
                return false; // Not connected to an access point
            }
            return true; // Connected to an access point
        }
        else {
            return false; // Wi-Fi adapter is OFF
        }
    }

    public static class WifiReceiver extends BroadcastReceiver {
        private WifiStatusCallback callback;

        public WifiReceiver(WifiStatusCallback callback){
            //callback to send the network data to
            this.callback = callback;
        }

        @Override
        public void onReceive(Context context, Intent intent) {
            ConnectivityManager conMan = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo netInfo = conMan.getActiveNetworkInfo();
            boolean connection = false;
            if (netInfo != null && netInfo.getType() == ConnectivityManager.TYPE_WIFI) {
                Log.d("WifiReceiver", "Have Wifi Connection");
                connection = true;
            } else {
                Log.d("WifiReceiver", "Don't have Wifi Connection");
                connection = false;
            }
            callback.onSuccess(connection);
        }
    };

    public static void displayNetworkInfo(Context context) {
        WifiManager mainWifi = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
        WifiInfo wifiInfo = mainWifi.getConnectionInfo();
        String ssid = wifiInfo.getSSID();
        int ip = wifiInfo.getIpAddress();
        String message = "Connection established.\nSSID = " + ssid + "; IP Address = " + ip;
        Log.d(TAG, message);
    }
}
