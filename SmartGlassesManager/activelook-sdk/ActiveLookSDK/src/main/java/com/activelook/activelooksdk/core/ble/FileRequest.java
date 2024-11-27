package com.activelook.activelooksdk.core.ble;

import com.android.volley.NetworkResponse;
import com.android.volley.Request;
import com.android.volley.Response;
import com.android.volley.toolbox.HttpHeaderParser;

class FileRequest extends Request<byte[]> {

    private final Response.Listener<byte[]> listener;

    FileRequest(final String url, final Response.Listener<byte[]> listener, final Response.ErrorListener errorListener) {
        super(Request.Method.GET, url, errorListener);
        this.listener = listener;
    }

    @Override
    protected Response<byte[]> parseNetworkResponse(final NetworkResponse response) {
        return Response.success(response.data, HttpHeaderParser.parseCacheHeaders(response));
    }

    @Override
    protected void deliverResponse(final byte[] response) {
        this.listener.onResponse(response);
    }

}
