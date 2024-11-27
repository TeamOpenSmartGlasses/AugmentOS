package com.wearableintelligencesystem.androidsmartglasses.ui;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.text.Html;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.navigation.NavController;
import androidx.navigation.Navigation;

import com.wearableintelligencesystem.androidsmartglasses.R;
import com.wearableintelligencesystem.androidsmartglasses.ASPClientSocket;
import com.wearableintelligencesystem.androidsmartglasses.MainActivity;
import com.wearableintelligencesystem.androidsmartglasses.archive.GlboxClientSocket;
import com.wearableintelligencesystem.androidsmartglasses.comms.MessageTypes;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class ASGFragment extends Fragment {
    protected String fragmentLabel;
    protected NavController navController;

    protected MainActivity mainActivity;

    @Override
    public void onResume(){
        super.onResume();
        getActivity().registerReceiver(myReceiver, makeComputeUpdateIntentFilter());
    }


    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        navController = Navigation.findNavController(getActivity(), R.id.nav_host_fragment);
        mainActivity = ((MainActivity)getActivity());
    }

    @Override
    public void onPause(){
        super.onPause();
        getActivity().unregisterReceiver(myReceiver);
    }

    private BroadcastReceiver myReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            onBroadcastReceive(context, intent);
        }
    };

    protected void onBroadcastReceive(Context context, Intent intent){
        //pass, should be overridden
    }

    public IntentFilter makeComputeUpdateIntentFilter() {
        final IntentFilter intentFilter = new IntentFilter();
        return intentFilter;
    }

}
