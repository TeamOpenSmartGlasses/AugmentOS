package com.teamopensmartglasses.convoscope;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GetTokenResult;

import org.json.JSONException;

public class TokenHelper {

    private static String cachedToken = null;
    private static long tokenExpirationTime = 0;

    public interface TokenListener {
        void onTokenReceived(String token) throws JSONException;
        void onTokenFailed(Exception exception);
    }

    public static void getToken(TokenListener listener) throws JSONException {
        // Set a buffer time of 5 minutes before expiration
        long bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

        if (cachedToken != null && (System.currentTimeMillis() + bufferTime) < tokenExpirationTime) {
            listener.onTokenReceived(cachedToken);
        } else {
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (user != null) {
                user.getIdToken(true).addOnCompleteListener(new OnCompleteListener<GetTokenResult>() {
                    @Override
                    public void onComplete(@NonNull Task<GetTokenResult> task) {
                        if (task.isSuccessful()) {
                            String idToken = task.getResult().getToken();
                            cachedToken = idToken;
                            tokenExpirationTime = System.currentTimeMillis() + (task.getResult().getExpirationTimestamp() * 1000);
                            try {
                                listener.onTokenReceived(idToken);
                            } catch (JSONException e) {
                                throw new RuntimeException(e);
                            }
                        } else {
                            listener.onTokenFailed(task.getException());
                        }
                    }
                });
            } else {
                listener.onTokenFailed(new Exception("User not authenticated"));
            }
        }
    }
}
