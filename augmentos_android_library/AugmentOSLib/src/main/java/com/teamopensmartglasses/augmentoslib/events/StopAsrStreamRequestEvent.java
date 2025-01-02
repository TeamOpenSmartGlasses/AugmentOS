package com.teamopensmartglasses.augmentoslib.events;

import com.teamopensmartglasses.augmentoslib.AsrStreamType;

import java.io.Serializable;

public class StopAsrStreamRequestEvent implements Serializable {
    public static final String eventId = "stopTranslationRequestEvent";

    public StopAsrStreamRequestEvent() {}
}