package com.augmentos.augmentos_core.tpa.eventbusmessages;

public class VoskAudioChunkNewEvent {
    public byte [] thisChunk;

    public VoskAudioChunkNewEvent(byte [] thisChunk){
        this.thisChunk = thisChunk;
    }
}
