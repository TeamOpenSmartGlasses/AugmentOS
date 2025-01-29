package com.augmentos.smartglassesmanager.eventbusmessages;

import com.augmentos.smartglassesmanager.utils.SmartGlassesConnectionState;

public class SmartGlassesConnectionEvent {
    public final SmartGlassesConnectionState connectionStatus;

    public SmartGlassesConnectionEvent(SmartGlassesConnectionState newSmartGlassesConnectionState) {
        this.connectionStatus = newSmartGlassesConnectionState;
    }
}