package com.augmentos.augmentoslib.events;

import com.augmentos.smartglassesmanager.supportedglasses.SmartGlassesDevice;
import com.augmentos.smartglassesmanager.utils.SmartGlassesConnectionState;

public class SmartGlassesConnectionStateChangedEvent {
    public final SmartGlassesDevice device;
    public SmartGlassesConnectionState connectionState;
    public SmartGlassesConnectionStateChangedEvent(SmartGlassesDevice newDevice, SmartGlassesConnectionState connectionState) {
        this.device = newDevice;
        this.connectionState = connectionState;
    }
}