package com.teamopensmartglasses.convoscope.ui;

import android.app.AlertDialog;
import android.content.DialogInterface;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.Button;
import android.widget.ListView;

import androidx.fragment.app.Fragment;
import androidx.navigation.NavController;
import androidx.navigation.Navigation;

import com.teamopensmartglasses.convoscope.MainActivity;
import com.teamopensmartglasses.convoscope.R;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.AudioWearable;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.InmoAirOne;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.SmartGlassesDevice;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.TCLRayNeoXTwo;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.VuzixShield;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.VuzixUltralite;

import java.util.ArrayList;

public class ConvoscopeUi extends Fragment {
    public String TAG = "WearableAi_ConvoscopeUi";

    private final String fragmentLabel = "Select Glasses to Connect...";

    private NavController navController;


    public SmartGlassesDevice [] smartGlassesDevices;

    public ConvoscopeUi() {
        // Required empty public constructor
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {

        // Inflate the layout for this fragment
        return inflater.inflate(R.layout.convoscope_fragment, container, false);
    }

    @Override
    public void onViewCreated(View view, Bundle savedInstanceState){
//        //setup titlebar
//        UiUtils.setupTitle(getActivity(), fragmentLabel);
//
//        //get the nav controller
//        navController = Navigation.findNavController(getActivity(), R.id.nav_host_fragment);
//
//        //setup list of smart glasses
//        glassesList = view.findViewById(R.id.smart_glasses_list);
//
//        // on the below line we are initializing the adapter for our list view.
//        ArrayList<SmartGlassesDevice> glassesArrayList = new ArrayList<>();
//
//        //ArrayAdapter<String> glassesListAdapter = new ArrayAdapter<>(view.getContext(), android.R.layout.simple_list_item_activated_1, glassesArrayList);
//        SmartGlassesListAdapter glassesListAdapter = new SmartGlassesListAdapter(glassesArrayList, getContext());
//
//        //listen for list presses
//        glassesList.setOnItemClickListener(new AdapterView.OnItemClickListener()
//        {
//            @Override
//            public void onItemClick(AdapterView<?> adapter, View v, int position,
//                                    long arg3)
//            {
//                glassesListAdapter.setSelectedPosition(position);
//            }
//        });
//
//        // on below line we are setting adapter for our list view.
//        glassesList.setAdapter(glassesListAdapter);
//        for (SmartGlassesDevice device : smartGlassesDevices){
//            Log.d(TAG, device.getDeviceModelName());
//            glassesListAdapter.add(device);
//        }
//
//        //setup buttons
//        final Button cancelButton = view.findViewById(R.id.cancel_select_smart_glasses_button);
//        cancelButton.setOnClickListener(new View.OnClickListener() {
//            public void onClick(View v) {
//                // Code here executes on main thread after user presses button
//                navController.navigate(R.id.nav_settings);
//                //((MainActivity)getActivity()).onBackPressed();
//            }
//        });
//
//        final Button selectButton = view.findViewById(R.id.select_smart_glasses_button);
//        selectButton.setOnClickListener(new View.OnClickListener() {
//            public void onClick(View v) {
//                // Code here executes on main thread after user presses button
//                SmartGlassesDevice selectedDevice = glassesListAdapter.getSelectedDevice();
//                if (selectedDevice == null) {
//                    Log.d(TAG, "Please choose a smart glasses device to continue.");
//                    showNoGlassSelectedDialog();
//                } else if (!selectedDevice.getAnySupport()){
//                    Log.d(TAG, "Glasses not yet supported, we're working on it.");
//                    showUnsupportedGlassSelected();
//                } else {
//                    Log.d(TAG, "Connecting to " + selectedDevice.getDeviceModelName() + "...");
//                    ((MainActivity)getActivity()).connectSmartGlasses(selectedDevice);
//
//                    navController.navigate(R.id.nav_connecting_to_smart_glasses);
//                    //((MainActivity)getActivity()).onBackPressed();
//                }
//            }
//        });
    }


}

