package com.teamopensmartglasses.augmentoslib.events;

import com.teamopensmartglasses.augmentoslib.DataStreamType;

import java.io.Serializable;

public class GlassesTapOutputEvent implements Serializable {
    public int numTaps; //number of contiguous taps (1, 2, or 3)
    public boolean sideOfGlasses; //left is 0, right is 1
    public long timestamp;
    public static final String eventId = "glassesTapOutputEvent";
    public static final DataStreamType dataStreamType = DataStreamType.GLASSES_SIDE_TAP;

    public GlassesTapOutputEvent(int numTaps, boolean sideOfGlasses, long timestamp){
        this.numTaps = numTaps;
        this.sideOfGlasses = sideOfGlasses;
        this.timestamp = timestamp;
    }
}
