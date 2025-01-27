package com.augmentos.augmentoslib.events;

import com.augmentos.smartglassesmanager.supportedglasses.SmartGlassesDevice;

public class SmartGlassesConnectedEvent {
    public final SmartGlassesDevice device;

    public SmartGlassesConnectedEvent(SmartGlassesDevice newDevice) {
        this.device = newDevice;
    }
}