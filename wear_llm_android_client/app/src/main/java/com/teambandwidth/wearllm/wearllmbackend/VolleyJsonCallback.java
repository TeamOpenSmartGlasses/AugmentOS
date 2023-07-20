package com.teambandwidth.wearllm.wearllmbackend;

import org.json.JSONObject;

public interface VolleyJsonCallback {
    void onSuccess(JSONObject result);
    void onFailure();
}