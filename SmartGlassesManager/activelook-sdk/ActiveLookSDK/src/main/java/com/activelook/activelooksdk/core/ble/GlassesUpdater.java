package com.activelook.activelooksdk.core.ble;

import android.content.Context;
import android.util.Pair;

import androidx.core.util.Consumer;
import androidx.core.util.Predicate;

import com.activelook.activelooksdk.DiscoveredGlasses;
import com.activelook.activelooksdk.Glasses;
import com.activelook.activelooksdk.types.GlassesUpdate;
import com.android.volley.RequestQueue;
import com.android.volley.toolbox.Volley;

class GlassesUpdater {

    private final RequestQueue requestQueue;
    private final String token;
    private final Consumer<GlassesUpdate> onUpdateStart;
    private final Consumer<Pair<GlassesUpdate, Runnable>> onUpdateAvailableCallback;
    private final Consumer<GlassesUpdate> onUpdateProgress;
    private final Consumer<GlassesUpdate> onUpdateSuccess;
    private final Consumer<GlassesUpdate> onUpdateError;

    GlassesUpdater(final Context context,
                   final String token,
                   final Consumer<GlassesUpdate> onUpdateStart,
                   final Consumer<Pair<GlassesUpdate, Runnable>> onUpdateAvailableCallback,
                   final Consumer<GlassesUpdate> onUpdateProgress,
                   final Consumer<GlassesUpdate> onUpdateSuccess,
                   final Consumer<GlassesUpdate> onUpdateError) {
        this.token = token;
        this.onUpdateStart = onUpdateStart;
        this.onUpdateAvailableCallback = onUpdateAvailableCallback;
        this.onUpdateProgress = onUpdateProgress;
        this.onUpdateSuccess = onUpdateSuccess;
        this.onUpdateError = onUpdateError;
        this.requestQueue = Volley.newRequestQueue(context);
    }

    public void update(final DiscoveredGlasses discoveredGlasses, final GlassesImpl glasses, final Consumer<Glasses> onConnected, Consumer<DiscoveredGlasses> onConnectionFail) {
        new UpdateGlassesTask(
                this.requestQueue,
                this.token,
                discoveredGlasses,
                glasses,
                this.onUpdateAvailableCallback,
                onConnected,
                onConnectionFail,
                this.onUpdateStart,
                this.onUpdateProgress,
                this.onUpdateSuccess,
                this.onUpdateError);
    }

}
