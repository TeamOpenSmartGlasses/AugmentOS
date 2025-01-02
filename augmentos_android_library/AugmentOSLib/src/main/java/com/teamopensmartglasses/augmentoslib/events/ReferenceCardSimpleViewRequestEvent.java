package com.teamopensmartglasses.augmentoslib.events;

import java.io.Serializable;

public class ReferenceCardSimpleViewRequestEvent implements Serializable {
    public String title;
    public String body;
    public int lingerTimeMs;
    public static final String eventId = "referenceCardSimpleViewRequestEvent";

    public ReferenceCardSimpleViewRequestEvent(String title, String body) {
        this.title = title;
        this.body = body;
        this.lingerTimeMs = 0;
    }

    public ReferenceCardSimpleViewRequestEvent(String title, String body, int lingerTimeMs) {
        this.title = title;
        this.body = body;
        this.lingerTimeMs = lingerTimeMs;
    }
}
