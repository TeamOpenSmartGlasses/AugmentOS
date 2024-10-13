package com.teamopensmartglasses.augmentoslib;

public interface TranscriptCallback extends SubscriptionCallback {
    void call(String transcript, long timestamp, boolean isFinal);
}
