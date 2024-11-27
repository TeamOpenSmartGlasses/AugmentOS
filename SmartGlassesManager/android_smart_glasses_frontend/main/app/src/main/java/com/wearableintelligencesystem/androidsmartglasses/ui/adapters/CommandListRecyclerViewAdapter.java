package com.wearableintelligencesystem.androidsmartglasses.ui.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.recyclerview.widget.RecyclerView;

import com.wearableintelligencesystem.androidsmartglasses.R;

import org.json.JSONArray;
import org.json.JSONException;

public class CommandListRecyclerViewAdapter extends RecyclerView.Adapter<CommandListRecyclerViewAdapter.ViewHolder> {

    private JSONArray commandListData;
    private LayoutInflater mInflater;
    private ItemClickListener mClickListener;

    // data is passed into the constructor
    public CommandListRecyclerViewAdapter(Context context, JSONArray data) {
        this.mInflater = LayoutInflater.from(context);
        this.commandListData = data;
    }

    // inflates the row layout from xml when needed
    @Override
    public ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View view = mInflater.inflate(R.layout.command_list_recyclerview_item, parent, false);
        return new ViewHolder(view);
    }

    // binds the data to the TextView in each row
    @Override
    public void onBindViewHolder(ViewHolder holder, int position) {
        String commandListName = null;
        try {
            commandListName = commandListData.getString(position);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        holder.commandListItemNameTextView.setText(commandListName + "...");
    }

    // total number of rows
    @Override
    public int getItemCount() {
        return commandListData.length();
    }


    // stores and recycles views as they are scrolled off screen
    public class ViewHolder extends RecyclerView.ViewHolder implements View.OnClickListener {
        TextView commandListItemNameTextView;

        ViewHolder(View itemView) {
            super(itemView);
            commandListItemNameTextView = itemView.findViewById(R.id.command_list_item_name);
            itemView.setOnClickListener(this);
        }

        @Override
        public void onClick(View view) {
            if (mClickListener != null) mClickListener.onItemClick(view, getAdapterPosition());
        }
    }

    // convenience method for getting data at click position
    String getItem(int id) {
        try {
            return commandListData.getString(id);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return "No Item Found";
    }

    // allows clicks events to be caught
    void setClickListener(ItemClickListener itemClickListener) {
        this.mClickListener = itemClickListener;
    }

    // parent activity will implement this method to respond to click events
    public interface ItemClickListener {
        void onItemClick(View view, int position);
    }
}