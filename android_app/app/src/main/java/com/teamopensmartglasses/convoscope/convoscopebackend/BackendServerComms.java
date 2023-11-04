package com.teamopensmartglasses.convoscope.convoscopebackend;

/*
Adapted from:
https://github.com/emexlabs/WearableIntelligenceSystem/blob/master/android_smart_phone/main/app/src/main/java/com/wearableintelligencesystem/androidsmartphone/comms/BackendServerComms.java
 */

import static com.teamopensmartglasses.convoscope.Config.*;
import static com.teamopensmartglasses.convoscope.Constants.*;

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
    private int requestTimeoutPeriod = 0; //15000;

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
    }

    //handles requesting data, sending data
    public void restRequest(String endpoint, JSONObject data, VolleyJsonCallback callback){
        //build the url
        String builtUrl = serverUrl + endpoint;

        //if using dev server, add /dev in front
        if (useDevServer) {
            builtUrl = serverUrl + "/dev" + endpoint;
        }

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
                        //

                        if(endpoint == CSE_ENDPOINT) {
                            try {
                                if (response.getBoolean("success")) {
                                    callback.onSuccess(response);
                                }
                            } catch (JSONException e) {
                            }
                        }

                        if(endpoint == LLM_QUERY_ENDPOINT || endpoint == BUTTON_EVENT_ENDPOINT) {
                            Log.d(TAG, response.toString());
                            if (response.has("message")) {
                                callback.onSuccess(response);
                            } else {
                                callback.onFailure();
                            }
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
//                DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                0,
                DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));

        mRequestQueue.add(request);
    }
}