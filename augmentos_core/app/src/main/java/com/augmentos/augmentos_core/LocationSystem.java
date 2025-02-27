package com.augmentos.augmentos_core;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Handler;
import android.os.Looper;

import androidx.core.app.ActivityCompat;

import com.augmentos.augmentos_core.augmentos_backend.ServerComms;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;

public class LocationSystem {
    private Context context;
    public double lat = 0;
    public double lng = 0;

    public double latestAccessedLat = 0;
    public double latestAccessedLong = 0;
    private FusedLocationProviderClient fusedLocationProviderClient;
    private LocationCallback locationCallback;

    private final Handler locationSendingLoopHandler = new Handler(Looper.getMainLooper());
    private Runnable locationSendingRunnableCode;
    private final long locationSendTime = 1000 * 60 * 30; // 30 minutes

    public LocationSystem(Context context) {
        this.context = context;
        fusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(context);
        setupLocationCallback();
        scheduleLocationUpdates();
    }

    public void requestLocationUpdate() {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        LocationRequest locationRequest = LocationRequest.create();
        locationRequest.setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY);
        locationRequest.setInterval(10000);  // Keep GPS on for a reasonable time to get a fix
        locationRequest.setFastestInterval(5000);
        locationRequest.setMaxWaitTime(60000); // Wait up to 60 seconds if needed for a fix

        fusedLocationProviderClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper());
    }

    public void stopLocationUpdates() {
        if (fusedLocationProviderClient != null && locationCallback != null) {
            fusedLocationProviderClient.removeLocationUpdates(locationCallback);
        }
    }

    public void sendLocationToServer() {
        double latitude = getNewLat();
        double longitude = getNewLng();

        if (latitude == -1 && longitude == -1) return;

        ServerComms.getInstance().sendLocationUpdate(latitude, longitude);
    }

    public double getNewLat() {
        if (latestAccessedLat == lat) return -1;
        latestAccessedLat = lat;
        return latestAccessedLat;
    }

    public double getNewLng() {
        if (latestAccessedLong == lng) return -1;
        latestAccessedLong = lng;
        return latestAccessedLong;
    }


    // Add a flag and a polling interval for first lock
    private boolean firstLockAcquired = false;
    private final long firstLockPollingInterval = 5000; // 5 seconds

    public void scheduleLocationUpdates() {
        locationSendingRunnableCode = new Runnable() {
            @Override
            public void run() {
                requestLocationUpdate(); // Request location fix

                if (!firstLockAcquired) {
                    // Poll more frequently until a fix is obtained
                    locationSendingLoopHandler.postDelayed(this, firstLockPollingInterval);
                } else {
                    // Once first fix is obtained, revert to normal interval
                    locationSendingLoopHandler.postDelayed(this, locationSendTime);
                }
            }
        };
        locationSendingLoopHandler.post(locationSendingRunnableCode);
    }

    private void setupLocationCallback() {
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null || locationResult.getLocations().isEmpty()) return;

                Location location = locationResult.getLastLocation();
                lat = location.getLatitude();
                lng = location.getLongitude();

                sendLocationToServer();
                stopLocationUpdates(); // Always cancel updates after receiving a fix

                if (!firstLockAcquired) {
                    firstLockAcquired = true;
                }
            }
        };
    }
}
