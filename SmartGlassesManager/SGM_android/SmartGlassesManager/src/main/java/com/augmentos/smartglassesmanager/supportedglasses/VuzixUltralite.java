package com.augmentos.smartglassesmanager.supportedglasses;

public class VuzixUltralite extends SmartGlassesDevice {
    public VuzixUltralite() {
        deviceModelName = "Vuzix Z100";
        deviceIconName = "vuzix_ultralite";
        anySupport = true;
        fullSupport = true;
        glassesOs = SmartGlassesOperatingSystem.ULTRALITE_MCU_OS_GLASSES;
        hasDisplay = true;
        hasSpeakers = false;
        hasCamera = false;
        hasInMic = false;
        hasOutMic = false;
        useScoMic = true;
        weight = 38;
    }
}
