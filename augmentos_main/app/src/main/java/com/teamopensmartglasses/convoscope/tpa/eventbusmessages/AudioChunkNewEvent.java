package com.teamopensmartglasses.convoscope.tpa.eventbusmessages;

public class AudioChunkNewEvent {
    public byte [] thisChunk;

    public AudioChunkNewEvent(byte [] thisChunk){
        this.thisChunk = thisChunk;
    }
}
