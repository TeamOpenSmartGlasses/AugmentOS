package com.teambandwidth.wearllm.asr.wearllmbackend;

/*
Adapted from:
https://github.com/emexlabs/WearableIntelligenceSystem/blob/master/android_smart_phone/main/app/src/main/java/com/wearableintelligencesystem/androidsmartphone/comms/BackendServerComms.java
 */

import android.content.Context;
import android.util.Log;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.Volley;

import org.json.JSONObject;
import org.json.JSONException;

public class BackendServerComms {
    private String TAG = "MXT2_BackendServerComms";

    private static BackendServerComms restServerComms;

    //volley vars
    public RequestQueue mRequestQueue;
    private Context mContext;
    private String serverUrl;
    private int requestTimeoutPeriod = 10000;

    //endpoints
    public static final String LLM_QUERY_ENDPOINT = "/chat";

    public static BackendServerComms getInstance(Context c){
        if (restServerComms == null){
            restServerComms = new BackendServerComms(c);
        }
        return restServerComms;
    }

    public BackendServerComms(Context context) {
        // Instantiate the RequestQueue.
        mContext = context;
        mRequestQueue = Volley.newRequestQueue(mContext);
        serverUrl = "https://1q93wu6qkd.execute-api.us-east-2.amazonaws.com"; //cayden
    }

    //handles requesting data, sending data
    public void restRequest(String endpoint, JSONObject data, VolleyJsonCallback callback){
        //build the url
        String builtUrl = serverUrl + endpoint;

        //get the request type
        int requestType = Request.Method.GET;
        if (data == null){
            requestType = Request.Method.GET;
        } else { //there is data to send, send post
            requestType = Request.Method.POST;
        }

        // Request a json response from the provided URL.
        JsonObjectRequest request = new JsonObjectRequest(requestType, builtUrl, data,
                new Response.Listener<JSONObject>() {
                    @Override
                    public void onResponse(JSONObject response) {
                        // Display the first 500 characters of the response string.
//                        Log.d(TAG, "Success requesting data, response:");
                        Log.d(TAG, response.toString());
                        try{
                            callback.onSuccess(response);
                            if (response.getString("message").length() > 0){
                                callback.onSuccess(response);
                            } else{
                                callback.onFailure();
                            }
                        } catch (JSONException e){
                            e.printStackTrace();
                        }
                    }
                }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                error.printStackTrace();
                Log.d(TAG, "Failure sending data.");
//                if (retry < 3) {
//                    retry += 1;
//                    refresh();
//                    search(query);
//                }
            }
        });

        request.setRetryPolicy(new DefaultRetryPolicy(
                requestTimeoutPeriod,
                DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));

        mRequestQueue.add(request);
    }
}