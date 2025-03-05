package com.augmentos.augmentos_core.smarterglassesmanager.supportedglasses;

public class MentraLive extends SmartGlassesDevice {
    public MentraLive() {
        deviceModelName = "Mentra Live";
        deviceIconName = "vuzix_shield";
        anySupport = true;
        fullSupport = true;
        glassesOs = SmartGlassesOperatingSystem.ANDROID_OS_GLASSES;
        hasDisplay = false;
        hasSpeakers = true;
        hasCamera = true;
        hasInMic = true;
        hasOutMic = true;
        weight = 44;
    }
}
