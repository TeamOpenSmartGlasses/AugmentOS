package com.teamopensmartglasses.augmentoslib;

import android.media.Image;

public interface GlassesPovImageCallback extends SubscriptionCallback {
    void call(String encodedImageString);
}
