package com.teamopensmartglasses.convoscope;

import static com.teamopensmartglasses.convoscope.BatteryOptimizationHelper.handleBatteryOptimization;
import static com.teamopensmartglasses.convoscope.BatteryOptimizationHelper.isSystemApp;

import android.Manifest;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.teamopensmartglasses.augmentoslib.tpa_helpers.TpaHelpers;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class PermissionsActivity extends AppCompatActivity {

    private static final int PERMISSION_REQUEST_CODE = 1001;
    private boolean userWentToSettings = false; // Tracks if user opened the battery optimization settings

    private static final int BACKGROUND_LOCATION_PERMISSION_CODE = 2001;

    private static final String TAG = "PermissionsActivity";

    private static final String[] BASE_PERMISSIONS = {
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.BLUETOOTH_SCAN,
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.BLUETOOTH_ADVERTISE,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.CAMERA,
            Manifest.permission.POST_NOTIFICATIONS,
    };

    private String[] REQUIRED_PERMISSIONS;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Conditionally add WRITE_EXTERNAL_STORAGE for devices < Android 10
        List<String> permissionsList = new ArrayList<>(Arrays.asList(BASE_PERMISSIONS));
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            permissionsList.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionsList.add(Manifest.permission.READ_MEDIA_IMAGES);
        } else {
            permissionsList.add(Manifest.permission.READ_EXTERNAL_STORAGE);
        }

        // Convert our List back to an array
        REQUIRED_PERMISSIONS = permissionsList.toArray(new String[0]);

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

                // All base permissions (including foreground location) granted
                // Now request background location separately on Android 10+
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
                        ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                                != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(this,
                            new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION},
                            BACKGROUND_LOCATION_PERMISSION_CODE);
                } else {
                    onPermissionsGranted();
                }
            } else {
                showPermissionDenialAlert();
            }
        } else if (requestCode == BACKGROUND_LOCATION_PERMISSION_CODE) {
            // Check if background location permission is granted
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                    == PackageManager.PERMISSION_GRANTED) {
                onPermissionsGranted();
            } else {
                // ... handle background location denial ...
                showPermissionDenialAlert();
            }
        }
    }

    public void showPermissionDenialAlert() {
        // Handle permission denial
        Log.e("PermissionsActivity", "Some permissions were denied.");
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Permissions Required")
                .setMessage("Not all permissions granted. AugmentOS will not work correctly without permissions.")
                .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int which) {
                        // Close the dialog
                        dialog.dismiss();
                    }
                });
        AlertDialog alert = builder.create();
        alert.setOnDismissListener(dialogInterface -> finish());
        alert.show();
    }

    private void onPermissionsGranted() {
        // Call the helper method for battery optimization handling
        if (isSystemApp(this)) {
            handleBatteryOptimization(this);
        } else {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                // If the device is *not* ignoring battery optimizations, prompt the user; otherwise, just continue
                if (!pm.isIgnoringBatteryOptimizations(getPackageName())) {
                    showBatteryOptimizationSettings();
                } else {
                    redirectAndFinish();
                }
            } else {
                // Pre-Marshmallow devices have no advanced battery optimization
                redirectAndFinish();
            }
        }
    }

    private void showBatteryOptimizationSettings() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Disable Battery Optimization")
                .setMessage("This application needs to remain active in the background to function properly. " +
                        "Please disable battery optimization for better performance and reliability.")
                .setPositiveButton("Go to Settings", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        userWentToSettings = true;
                        Intent intent = new Intent();
                        intent.setAction(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                        startActivity(intent);
                    }
                })
                .setNegativeButton("Back", (dialog, which) -> {
                    redirectAndFinish();
                });
        ;
        AlertDialog alert = builder.create();
        alert.show();
    }

    @Override
    protected void onResume() {
        super.onResume();
        // If userWentToSettings was set to true, they've returned from the Settings screen
        if (userWentToSettings) {
            Log.d(TAG, "User returned from battery optimization settings, finishing activity...");
            redirectAndFinish();
        }
    }

    public void redirectAndFinish(){
        TpaHelpers.redirectToAugmentOsManagerIfAvailable(this);
        finish();
    }
}
