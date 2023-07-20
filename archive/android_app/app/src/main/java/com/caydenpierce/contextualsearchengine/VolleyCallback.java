package com.caydenpierce.contextualsearchengine;

import org.json.JSONObject;

public interface VolleyCallback {
    void onSuccess(JSONObject result);
    void onFailure();
}