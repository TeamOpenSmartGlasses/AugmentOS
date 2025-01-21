package com.teamopensmartglasses.convoscope.defaultdashboard;

import com.teamopensmartglasses.augmentoslib.AugmentOSLib;
import com.teamopensmartglasses.augmentoslib.SmartGlassesAndroidService;


public class DefaultDashboardService extends SmartGlassesAndroidService {
    public static final String TAG = "DefaultDashboard";

    // Our instance of the AugmentOS library
    public AugmentOSLib augmentOSLib;

    public DefaultDashboardService() {
        super();
    }

    @Override
    public void onCreate() {
        super.onCreate();

        // Create AugmentOSLib instance with context: this
        augmentOSLib = new AugmentOSLib(this);
    }
}
