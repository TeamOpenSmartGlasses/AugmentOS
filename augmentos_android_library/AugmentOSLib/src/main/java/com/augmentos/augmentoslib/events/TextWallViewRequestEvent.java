package com.augmentos.augmentoslib.events;

import java.io.Serializable;

public class TextWallViewRequestEvent implements Serializable {
    public String text;
    public int x_pos = -1;
    public static final String eventId = "textWallViewRequestEvent";

    public TextWallViewRequestEvent(String text) {
        this.text = text;
    }

    public TextWallViewRequestEvent(String text, int x_pos) {
        this.text = text;
        this.x_pos = x_pos;
    }
}
