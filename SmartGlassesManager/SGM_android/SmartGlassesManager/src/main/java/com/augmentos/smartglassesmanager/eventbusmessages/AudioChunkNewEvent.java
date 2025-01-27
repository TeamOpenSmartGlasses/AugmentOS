package com.augmentos.augmentoslib.events;

public class AudioChunkNewEvent {
    public byte [] thisChunk;

    public AudioChunkNewEvent(byte [] thisChunk){
        this.thisChunk = thisChunk;
    }
}
