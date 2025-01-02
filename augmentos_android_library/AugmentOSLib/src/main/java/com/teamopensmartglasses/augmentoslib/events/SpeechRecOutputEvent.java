package com.teamopensmartglasses.augmentoslib.events;

import java.io.Serializable;

public class SpeechRecOutputEvent implements Serializable {
    public String text;
    public String languageCode;
    public long timestamp;
    public boolean isFinal;
    public final boolean isTranslated;
    public static final String eventId = "SpeechRecOutputEvent";
    public boolean isTranslationOrigin;

    public SpeechRecOutputEvent(String text, String languageCode, long timestamp, boolean isFinal, boolean isTranslated, boolean isTranslationOrigin){
        this.text = text;
        this.languageCode = languageCode;
        this.timestamp = timestamp;
        this.isFinal = isFinal;
        this.isTranslated = isTranslated;
        this.isTranslationOrigin = isTranslationOrigin;
    }

    public SpeechRecOutputEvent(String text, String languageCode, long timestamp, boolean isFinal, boolean isTranslated){
        this.text = text;
        this.languageCode = languageCode;
        this.timestamp = timestamp;
        this.isFinal = isFinal;
        this.isTranslated = isTranslated;
    }
}
