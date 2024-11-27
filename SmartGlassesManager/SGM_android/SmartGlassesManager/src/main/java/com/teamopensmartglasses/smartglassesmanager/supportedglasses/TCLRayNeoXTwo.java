package com.teamopensmartglasses.smartglassesmanager.supportedglasses;

public class TCLRayNeoXTwo extends SmartGlassesDevice {
    public TCLRayNeoXTwo() {
        deviceModelName = "TCL RayNeo X2";
        deviceIconName = "tcl_rayneo_x_two";
        anySupport = true;
        fullSupport = false;
        glassesOs = SmartGlassesOperatingSystem.ANDROID_OS_GLASSES;
        hasDisplay = true;
        hasSpeakers = true;
        hasCamera = true;
        hasInMic = true;
        hasOutMic = false; //unknown
        weight = 120; //unknown
    }
}
