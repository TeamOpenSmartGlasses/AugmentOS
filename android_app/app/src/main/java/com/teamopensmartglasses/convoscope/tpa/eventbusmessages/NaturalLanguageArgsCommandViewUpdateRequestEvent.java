package com.teamopensmartglasses.convoscope.tpa.eventbusmessages;

public class NaturalLanguageArgsCommandViewUpdateRequestEvent {
    public String naturalLanguageInput;
    public static final String eventId = "naturalLanguageUpdateRequest";

    public NaturalLanguageArgsCommandViewUpdateRequestEvent(String naturalLanguageInput) {
        this.naturalLanguageInput = naturalLanguageInput;
    }
}
