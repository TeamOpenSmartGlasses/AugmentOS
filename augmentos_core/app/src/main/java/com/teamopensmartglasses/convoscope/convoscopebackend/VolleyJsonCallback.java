package com.teamopensmartglasses.convoscope.convoscopebackend;

import org.json.JSONException;
import org.json.JSONObject;

public interface VolleyJsonCallback {
    void onSuccess(JSONObject result) throws JSONException;
    void onFailure(int code);
}