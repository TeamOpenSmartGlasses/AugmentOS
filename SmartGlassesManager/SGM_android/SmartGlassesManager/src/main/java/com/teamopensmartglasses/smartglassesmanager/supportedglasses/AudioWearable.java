package com.teamopensmartglasses.smartglassesmanager.supportedglasses;

public class AudioWearable extends SmartGlassesDevice {
    public AudioWearable() {
        deviceModelName = "Audio Wearable";
        deviceIconName = "bluetooth_earpiece";
        anySupport = true;
        fullSupport = true;
        glassesOs = SmartGlassesOperatingSystem.AUDIO_WEARABLE_GLASSES;
        hasDisplay = false;
        hasSpeakers = false; //set as false because we want to do this from ASP
        hasCamera = false;
        hasInMic = false; //set as false because we want to do this from ASP
        hasOutMic = false;
        useScoMic = true;
        weight = 14;
    }
}