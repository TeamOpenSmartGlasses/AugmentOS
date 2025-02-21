package com.augmentos.smartglassesmanager.cpp;

public class L3cCpp {

    static {
        System.loadLibrary("lc3");
    }

    private L3cCpp() {
        // Private constructor to prevent instantiation
    }

    public static void init() {
        // This method can be used for additional initialization if needed
    }

    public static native byte[] decodeLC3(byte[] lc3Data);

    public static native byte[] encodeLC3(byte[] lc3Data);

    public static native float[] rnNoise(long st, float[] input);

    public static native long createRNNoiseState();

    public static native void destroyRNNoiseState(long st);
}
