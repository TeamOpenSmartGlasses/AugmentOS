package com.teamopensmartglasses.augmentoslib.events;

import java.io.Serializable;

public class ReferenceCardSimpleViewRequestEvent implements Serializable {
    public String title;
    public String body;
    public int lingerTimeMs = 6; // Default linger time
    public static final String eventId = "referenceCardSimpleViewRequestEvent";

    public ReferenceCardSimpleViewRequestEvent(String title, String body) {
        this.title = title;
        this.body = body;
    }

    public ReferenceCardSimpleViewRequestEvent(String title, String body, int lingerTimeMs) {
        this.title = title;
        this.body = body;
        if (lingerTimeMs != 0) { // Leave default value if 0
            this.lingerTimeMs = lingerTimeMs;
        }
    }
}
