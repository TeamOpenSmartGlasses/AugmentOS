package com.teamopensmartglasses.convoscope.ui;

import static com.teamopensmartglasses.augmentoslib.AugmentOSGlobalConstants.AugmentOSManagerPackageName;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.navigation.NavController;
import androidx.navigation.Navigation;
import androidx.preference.PreferenceManager;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.teamopensmartglasses.augmentoslib.tpa_helpers.TpaHelpers;
import com.teamopensmartglasses.convoscope.PermissionsActivity;
import com.teamopensmartglasses.convoscope.R;

public class LandingUi extends Fragment {
  public final String TAG = "Convoscope_LandingActivity";
  public final String fragmentLabel = "Landing page";
  private NavController navController;
  private FirebaseAuth mAuth;

  public LandingUi(){

  }

  @Override
  public View onCreateView(LayoutInflater inflater, ViewGroup container,
                           Bundle savedInstanceState) {
    // Inflate the layout for this fragment
    return inflater.inflate(R.layout.landing_fragment, container, false);
  }

  @Override
  public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    navController = Navigation.findNavController(getActivity(), R.id.nav_host_fragment);

    // Check if we're already logged in... if so, skip to MainActivity
    mAuth = FirebaseAuth.getInstance();
    FirebaseUser currentUser = mAuth.getCurrentUser();

    // TODO: AugmentOS should not need firebase
    //  But we do need to reevaluate this whole thing later
    if (currentUser != null) {
      Log.d(TAG, "Already logged in, skipping to main UI");
      //navController.navigate(R.id.nav_convoscope);
      Intent intent = new Intent(getContext(), PermissionsActivity.class);
      startActivity(intent);

      // Optionally, finish the current activity if you don't want the user to go back here
      if (getActivity() != null) {
        getActivity().finish();
      }

    }

//    final Button landingButton = view.findViewById(R.id.landing_button);
//    landingButton.setOnClickListener(new View.OnClickListener() {
//      public void onClick(View v) {
//        navController.navigate(R.id.nav_login);
//      }
//    });
  }

  public String getSavedAuthToken(){
      return PreferenceManager.getDefaultSharedPreferences(getContext()).getString("auth_token", "");
  }
}