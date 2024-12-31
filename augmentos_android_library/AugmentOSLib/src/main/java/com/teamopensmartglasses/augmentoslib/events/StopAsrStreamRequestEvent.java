package com.teamopensmartglasses.augmentoslib.events;

import com.teamopensmartglasses.augmentoslib.AsrStreamType;

import java.io.Serializable;

public class StopAsrStreamRequestEvent implements Serializable {
    public final String transcribeLanguage;
    public final String translateLanguage;
    public final AsrStreamType asrStreamType;
    public final String packageName;

    public static final String eventId = "stopTranslationRequestEvent";

    public StopAsrStreamRequestEvent(String transcribeLanguage) {
        this.transcribeLanguage = transcribeLanguage;
        this.translateLanguage = null;
        this.asrStreamType = AsrStreamType.TRANSCRIPTION;
        this.packageName = null; // Unknown at creation
    }

    // Constructor for translation
    public StopAsrStreamRequestEvent(String transcribeLanguage, String translateLanguage) {
        this.transcribeLanguage = transcribeLanguage;
        this.translateLanguage = translateLanguage;
        this.asrStreamType = AsrStreamType.TRANSLATION;
        this.packageName = null; // Unknown at creation
    }

    private StopAsrStreamRequestEvent(
            String transcribeLanguage,
            String translateLanguage,
            AsrStreamType asrStreamType,
            String packageName
    ) {
        this.transcribeLanguage = transcribeLanguage;
        this.translateLanguage = translateLanguage;
        this.asrStreamType = asrStreamType;
        this.packageName = packageName;
    }

    public StopAsrStreamRequestEvent withPackageName(String packageName) {
        return new StopAsrStreamRequestEvent(
                this.transcribeLanguage,
                this.translateLanguage,
                this.asrStreamType,
                packageName
        );
    }
}