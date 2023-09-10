package com.teamopensmartglasses.convoscope.convoscopebackend;

import org.json.JSONObject;

public interface VolleyJsonCallback {
    void onSuccess(JSONObject result);
    void onFailure();
}