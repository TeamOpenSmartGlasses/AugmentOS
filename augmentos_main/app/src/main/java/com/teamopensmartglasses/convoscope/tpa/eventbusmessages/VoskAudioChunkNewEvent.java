package com.teamopensmartglasses.convoscope.tpa.eventbusmessages;

public class VoskAudioChunkNewEvent {
    public byte [] thisChunk;

    public VoskAudioChunkNewEvent(byte [] thisChunk){
        this.thisChunk = thisChunk;
    }
}
