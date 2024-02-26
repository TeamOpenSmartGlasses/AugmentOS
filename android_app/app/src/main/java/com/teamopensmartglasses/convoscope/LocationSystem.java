package com.teamopensmartglasses.convoscope;

import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;

import androidx.core.app.ActivityCompat;

public class LocationSystem {
    Context context;
    public double lat = 0;
    public double lng = 0;
    private LocationManager locationManager;

    public LocationSystem(Context context) {
        this.context = context;
        locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        getUserLocation();
    }

    public void getUserLocation() {
        if (ActivityCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED && ActivityCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
//         TODO: Consider calling
//            ActivityCompat#requestPermissions
//         here to request the missing permissions, and then overriding
//           public void onRequestPermissionsResult(int requestCode, String[] permissions,
//                                                  int[] grantResults)
//         to handle the case where the user grants the permission. See the documentation
//         for ActivityCompat#requestPermissions for more details.
//         Toast.makeText(context.getApplicationContext(), "Please enable location permissions!", Toast.LENGTH_LONG);
            return;
        }
        locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 0, 0, new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                lat = location.getLatitude();
                lng = location.getLongitude();
            }
        });
    }
}
