package com.teamopensmartglasses.augmentoslib.events;

import com.teamopensmartglasses.augmentoslib.DataStreamType;

import java.io.Serializable;

public class SmartRingButtonOutputEvent implements Serializable {
    public int buttonId;
    public long timestamp;
    public boolean isDown;
    public static final String eventId = "buttonOutputEvent";
    public static final DataStreamType dataStreamType = DataStreamType.SMART_RING_BUTTON;

    public SmartRingButtonOutputEvent(int buttonId, long timestamp, boolean isDown){
        this.buttonId = buttonId;
        this.timestamp = timestamp;
        this.isDown = isDown;
    }
}
