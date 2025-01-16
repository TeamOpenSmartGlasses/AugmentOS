package com.teamopensmartglasses.smartglassesmanager.eventbusmessages;

public class GlassesBatteryLevelEvent {
    public final int batteryLevel;
    public GlassesBatteryLevelEvent(int batteryLevel) {
        this.batteryLevel = batteryLevel;
    }
}
