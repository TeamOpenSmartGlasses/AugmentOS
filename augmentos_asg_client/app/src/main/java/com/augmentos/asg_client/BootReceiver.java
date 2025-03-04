package com.augmentos.asg_client;


import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d("BOOTRECEIVER", "BootReceiver triggered");
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.d("BOOTRECEIVER", "Starting BootService...");
            Intent serviceIntent = new Intent(context, BootService.class);
            context.startForegroundService(serviceIntent); // Start the foreground service
        }
    }
}