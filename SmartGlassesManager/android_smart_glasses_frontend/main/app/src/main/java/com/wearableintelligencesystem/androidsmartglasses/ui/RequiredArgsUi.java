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

public class RequiredArgsUi extends ASGFragment {
    private final String TAG = "WearableAi_RequiredArgsUi";

    public RequiredArgsUi() {
        fragmentLabel = "RequiredArgs";
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        return inflater.inflate(R.layout.required_args_fragment, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.onViewCreated(view, savedInstanceState);

        JSONArray argList = null;
        try {
            argList = new JSONArray(getArguments().getString(MessageTypes.ARG_OPTIONS));
            CommandListRecyclerViewAdapter argListRecyclerViewAdapter;
            RecyclerView argListRecyclerView = view.findViewById(R.id.args_list_recycler_view);
            TextView mainTitle = view.findViewById(R.id.main_title);
            mainTitle.setText(getArguments().getString(MessageTypes.ARG_NAME));
            argListRecyclerView.setLayoutManager(new LinearLayoutManager(this.mainActivity));
            argListRecyclerViewAdapter = new CommandListRecyclerViewAdapter(this.mainActivity, argList);
            argListRecyclerView.setAdapter(argListRecyclerViewAdapter);
            Log.d(TAG, argList.getString(0));
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }
}




