package com.augmentos.augmentos_core;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Handler;
import android.os.Looper;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.augmentos.augmentos_core.augmentos_backend.ServerComms;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.tasks.OnSuccessListener;

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
    private final long locationSendTime = 1000 * 60 * 8; // 8 minutes

    public LocationSystem(Context context) {
        this.context = context;
        fusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(context);
        setupLocationCallback();
        scheduleLocationUpdates();
    }

    private void setupLocationCallback() {
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null || locationResult.getLocations().isEmpty()) return;

                // Get the most recent location
                Location location = locationResult.getLastLocation();
                lat = location.getLatitude();
                lng = location.getLongitude();

                sendLocationToServer();
                stopLocationUpdates(); // Turn off GPS after successful fix
            }
        };
    }

    public void startLocationSending() {
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

    private void scheduleLocationUpdates() {
        locationSendingRunnableCode = new Runnable() {
            @Override
            public void run() {
                requestLocationUpdate(); // Turn on GPS and request a fix
                locationSendingLoopHandler.postDelayed(this, locationSendTime); // Schedule next run
            }
        };
        locationSendingLoopHandler.post(locationSendingRunnableCode);
    }

    private void sendLocationToServer() {
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
}
