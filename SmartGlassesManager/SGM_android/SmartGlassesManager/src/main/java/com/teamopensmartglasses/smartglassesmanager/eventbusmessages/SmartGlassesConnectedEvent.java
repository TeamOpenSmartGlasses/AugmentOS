package com.teamopensmartglasses.augmentoslib.events;

import com.teamopensmartglasses.smartglassesmanager.supportedglasses.SmartGlassesDevice;

public class SmartGlassesConnectedEvent {
    public final SmartGlassesDevice device;

    public SmartGlassesConnectedEvent(SmartGlassesDevice newDevice) {
        this.device = newDevice;
    }
}