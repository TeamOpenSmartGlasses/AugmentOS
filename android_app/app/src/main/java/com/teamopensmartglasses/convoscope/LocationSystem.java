package com.teamopensmartglasses.convoscope;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class LocationSystem {

    public JSONObject getUserLocation() throws JSONException, IOException {
        String googleMapsApiKey = BuildConfig.GOOGLE_MAPS_API_KEY;
        String geolocationUrl = "https://www.googleapis.com/geolocation/v1/geolocate?key=" + googleMapsApiKey;
        JSONObject data = new JSONObject();
        data.put("considerIp", "true");

        OkHttpClient client = new OkHttpClient();
        RequestBody body = RequestBody.create(data.toString(), MediaType.get("application/json; charset=utf-8"));
        Request request = new Request.Builder()
                .url(geolocationUrl)
                .post(body)
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) throw new IOException("Unexpected code " + response);

            String responseBody = response.body().string();
            return new JSONObject(responseBody);

        } catch (IOException e) {
            System.out.println("Error fetching user location: " + e.getMessage());
            throw e;
        }
    }
}
