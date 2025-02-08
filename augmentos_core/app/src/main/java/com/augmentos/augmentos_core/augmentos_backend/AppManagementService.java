package com.augmentos.augmentos_core.augmentos_backend;
import java.io.IOException;
import java.util.Collections;
import java.util.List;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.MediaType;
import okhttp3.RequestBody;

public class AppManagementService {

    private static final String BASE_URL = "http://localhost:7002";
    private final OkHttpClient client;

    public AppManagementService() {
        this.client = new OkHttpClient();
    }

    public List<App> getAvailableApps() throws IOException {
        Request request = new Request.Builder()
                .url(BASE_URL + "/apps")
                .get()
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Unexpected code: " + response);
            }
            String json = response.body().string();
            // Parse the JSON (Jackson, Gson, etc.)
            return parseAppsJson(json);
        }
    }

    public String startApp(String appId, String sessionId) throws IOException {
        if (sessionId == null) {
            throw new IllegalStateException("sessionId is null");
        }

        String jsonBody = "{\"sessionId\":\"" + sessionId + "\"}";
        RequestBody body = RequestBody.create(
                jsonBody,
                MediaType.get("application/json; charset=utf-8")
        );

        Request request = new Request.Builder()
                .url(BASE_URL + "/apps/" + appId + "/start")
                .post(body)
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to start app: " + response);
            }
            String json = response.body().string();
            // parse "tpaSessionId" from JSON
            return parseTpaSessionIdFromJson(json);
        }
    }

    public void stopApp(String appId, String sessionId) throws IOException {
        if (sessionId == null) {
            throw new IllegalStateException("sessionId is null");
        }
        // Possibly a POST or DELETE, depending on your API
        String jsonBody = "{\"sessionId\":\"" + sessionId + "\"}";
        RequestBody body = RequestBody.create(
                jsonBody,
                MediaType.get("application/json; charset=utf-8")
        );

        Request request = new Request.Builder()
                .url(BASE_URL + "/apps/" + appId + "/stop")
                .post(body)
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to stop app: " + response);
            }
        }
    }

    // Fill in or replace with real JSON parsing
    private List<App> parseAppsJson(String json) {
        // ...
        return Collections.emptyList();
    }

    private String parseTpaSessionIdFromJson(String json) {
        // ...
        return "";
    }

    public static class App {
        private String appId;
        private String name;

        // Getters / setters ...
    }
}
