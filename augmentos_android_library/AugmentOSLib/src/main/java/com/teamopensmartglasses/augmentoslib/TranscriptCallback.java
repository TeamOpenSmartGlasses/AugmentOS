package com.teamopensmartglasses.augmentoslib;

public interface TranscriptCallback extends SubscriptionCallback {
    void call(String transcript, String languageCode, long timestamp, boolean isFinal);
}