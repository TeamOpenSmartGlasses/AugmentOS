package com.wearableintelligencesystem.androidsmartglasses.ui;

import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.wearableintelligencesystem.androidsmartglasses.R;
import com.wearableintelligencesystem.androidsmartglasses.comms.MessageTypes;
import com.wearableintelligencesystem.androidsmartglasses.ui.adapters.CommandListRecyclerViewAdapter;

import org.json.JSONArray;
import org.json.JSONException;

public class WakeWordPostUi extends ASGFragment {
    private final String TAG = "WearableAi_WakeWordPostUi";

    public WakeWordPostUi() {
        fragmentLabel = "Wake Word Received";
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        return inflater.inflate(R.layout.wake_word_post_fragment, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.onViewCreated(view, savedInstanceState);

        JSONArray commandList = null;
        try {
            commandList = new JSONArray(getArguments().getString(MessageTypes.VOICE_COMMAND_LIST));
            CommandListRecyclerViewAdapter commandListRecyclerViewAdapter;
            RecyclerView commandListRecyclerView = view.findViewById(R.id.command_list_recycler_view);
//            TextView mainTitle = view.findViewById(R.id.main_title);
//            mainTitle.setText(getArguments().getString(MessageTypes.INPUT_WAKE_WORD));
            commandListRecyclerView.setLayoutManager(new LinearLayoutManager(this.mainActivity));
            commandListRecyclerViewAdapter = new CommandListRecyclerViewAdapter(this.mainActivity, commandList);
            commandListRecyclerView.setAdapter(commandListRecyclerViewAdapter);
            Log.d(TAG, commandList.getString(0));
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }
}



