package com.teamopensmartglasses.convoscope;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.CompoundButton;
import android.widget.Switch;

import androidx.activity.result.ActivityResultCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.firebase.ui.auth.AuthUI;
import com.firebase.ui.auth.FirebaseAuthUIActivityResultContract;
import com.firebase.ui.auth.IdpResponse;
import com.firebase.ui.auth.data.model.FirebaseAuthUIAuthenticationResult;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.ActionCodeSettings;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GetTokenResult;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.ASR_FRAMEWORKS;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;


public class LandingActivity extends AppCompatActivity {
  public final String TAG = "Convoscope_LandingActivity";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_landing);

    // Check if we're already logged in... if so, skip to MainActivity
    FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
    if (user != null) {
      startMainActivity();
    }

    final Button landingButton = findViewById(R.id.landing_button);
    landingButton.setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        startMainActivity();
      }
    });
  }

  public void startMainActivity(){
    Intent intent = new Intent(LandingActivity.this, MainActivity.class);
    startActivity(intent);
    intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    finish();
  }
}
