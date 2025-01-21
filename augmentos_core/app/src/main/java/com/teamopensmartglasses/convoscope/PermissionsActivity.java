package com.teamopensmartglasses.convoscope;

import static com.teamopensmartglasses.convoscope.BatteryOptimizationHelper.handleBatteryOptimization;
import static com.teamopensmartglasses.convoscope.BatteryOptimizationHelper.isSystemApp;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.teamopensmartglasses.augmentoslib.tpa_helpers.TpaHelpers;

public class PermissionsActivity extends AppCompatActivity {

    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final String TAG = "PermissionsActivity";

    private static final String[] REQUIRED_PERMISSIONS = {
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_BACKGROUND_LOCATION,
            Manifest.permission.BLUETOOTH_SCAN,
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.BLUETOOTH_ADVERTISE,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.WRITE_EXTERNAL_STORAGE,
            Manifest.permission.CAMERA,
            Manifest.permission.POST_NOTIFICATIONS,
            Manifest.permission.READ_EXTERNAL_STORAGE
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Check if permissions are already granted
        if (areAllPermissionsGranted(false)) {
            onPermissionsGranted();
        } else {
            // Request permissions
            ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, PERMISSION_REQUEST_CODE);
        }
    }

    private boolean areAllPermissionsGranted(boolean print) {
        for (String permission : REQUIRED_PERMISSIONS) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                if (print) {
                    Log.d(TAG, "Missing permission: " + permission.toLowerCase());
                }
                return false;
            }
        }
        return true;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (areAllPermissionsGranted(true)) {
                onPermissionsGranted();
            } else {
                // Handle permission denial
                Log.e("PermissionsActivity", "Some permissions were denied.");
                finish(); // Exit if permissions are not granted
            }
        }
    }

    private void onPermissionsGranted() {
        // Call the helper method for battery optimization handling
        if (isSystemApp(this)) {
            handleBatteryOptimization(this);
        } else {
            // Show battery optimization settings for user to disable manually
            showBatteryOptimizationSettings();
        }

        //BOUNCE OVER :)
        TpaHelpers.redirectToAugmentOsManagerIfAvailable(this);
        // Finish this activity and return to the Manager
        finish();
    }

    private void showBatteryOptimizationSettings() {
        Intent intent = new Intent();
        intent.setAction(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        startActivity(intent);
    }
}
