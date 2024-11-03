package com.teamopensmartglasses.convoscope.tpa.eventbusmessages;

public class GoogleAudioChunkNewEvent {
    public byte [] thisChunk;

    public GoogleAudioChunkNewEvent(byte [] thisChunk){
        this.thisChunk = thisChunk;
    }
}
