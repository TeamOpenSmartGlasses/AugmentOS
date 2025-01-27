package com.augmentos.augmentoslib.events;

import java.io.Serializable;

public class TranslateOutputEvent implements Serializable {
    public String text;
    public String languageCode;
    public long timestamp;
    public boolean isFinal;
    public boolean isTranslated = false;
    public static final String eventId = "TranslateOutputEvent";

    public TranslateOutputEvent(String text, String languageCode, long timestamp, boolean isFinal){
        this.text = text;
        this.languageCode = languageCode;
        this.timestamp = timestamp;
        this.isFinal = isFinal;
    }

    public TranslateOutputEvent(String text, String languageCode, long timestamp, boolean isFinal, boolean isTranslated){
        this.text = text;
        this.languageCode = languageCode;
        this.timestamp = timestamp;
        this.isFinal = isFinal;
        this.isTranslated = isTranslated;
    }
}
