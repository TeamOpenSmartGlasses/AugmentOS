package com.augmentos.augmentos_core.smarterglassesmanager.supportedglasses;

public class SelfAudio extends SmartGlassesDevice {
    public SelfAudio() {
        deviceModelName = "Mentra Live";
        deviceIconName = "vuzix_shield";
        anySupport = true;
        fullSupport = true;
        glassesOs = SmartGlassesOperatingSystem.SELF_OS_GLASSES;
        hasDisplay = false;
        hasSpeakers = true;
        hasCamera = true;
        hasInMic = true;
        hasOutMic = true;
        weight = 44;
    }
}
