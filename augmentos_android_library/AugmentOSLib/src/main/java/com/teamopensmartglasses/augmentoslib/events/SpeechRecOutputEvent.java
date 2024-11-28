package com.teamopensmartglasses.augmentoslib.events;

import java.io.Serializable;

public class SpeechRecOutputEvent implements Serializable {
    public String text;
    public long timestamp;
    public boolean isFinal;
    public boolean isTranslated = false;
    public static final String eventId = "SpeechRecOutputEvent";

    public SpeechRecOutputEvent(String text, long timestamp, boolean isFinal){
        this.text = text;
        this.timestamp = timestamp;
        this.isFinal = isFinal;
    }

    public SpeechRecOutputEvent(String text, long timestamp, boolean isFinal, boolean isTranslated){
        this.text = text;
        this.timestamp = timestamp;
        this.isFinal = isFinal;
        this.isTranslated = isTranslated;
    }
}
