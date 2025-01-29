package com.augmentos.smartglassesmanager.supportedglasses;

// this is the test device, when someone runs the Android smart glasses thing client on an Android phone
public class AndroidPhoneTestGlasses extends SmartGlassesDevice {
    public AndroidPhoneTestGlasses() {
        deviceModelName = "AndroidPhoneTestGlasses";
        anySupport = true;
        fullSupport = true;
        glassesOs = SmartGlassesOperatingSystem.ANDROID_OS_GLASSES;
        hasDisplay = true;
        hasSpeakers = true;
        hasCamera = true;
        hasInMic = true;
        hasOutMic = true;
        weight = 160;
    }
}
