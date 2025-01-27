package com.augmentos.smartglassesmanager.eventbusmessages;

public class BatteryLevelEvent {
    // -1 is auto brightness

    public final int batteryLevel;
    public BatteryLevelEvent(int batteryLevel) {
        this.batteryLevel = batteryLevel;
    }
}
