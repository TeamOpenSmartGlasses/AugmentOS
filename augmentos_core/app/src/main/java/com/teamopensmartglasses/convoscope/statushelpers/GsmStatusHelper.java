package com.teamopensmartglasses.convoscope.statushelpers;

import android.annotation.SuppressLint;
import android.content.Context;
import android.telephony.CellInfo;
import android.telephony.CellInfoGsm;
import android.telephony.TelephonyManager;
import android.telephony.SignalStrength;
import android.util.Log;

public class GsmStatusHelper {
    private final TelephonyManager telephonyManager;

    public GsmStatusHelper(Context context) {
        this.telephonyManager = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
    }

    @SuppressLint("MissingPermission")
    public boolean isConnected() {
        try {
            int networkType = telephonyManager.getNetworkType();
            return networkType != TelephonyManager.NETWORK_TYPE_UNKNOWN;
        } catch (Exception e) {
            return true;
        }
    }

    @SuppressLint("MissingPermission")
    public String getNetworkType() {
        try {
            int networkType = telephonyManager.getNetworkType();
            switch (networkType) {
                case TelephonyManager.NETWORK_TYPE_GSM:
                    return "GSM";
                case TelephonyManager.NETWORK_TYPE_LTE:
                    return "LTE";
                case TelephonyManager.NETWORK_TYPE_UMTS:
                    return "UMTS";
                case TelephonyManager.NETWORK_TYPE_HSDPA:
                    return "HSDPA";
                case TelephonyManager.NETWORK_TYPE_HSUPA:
                    return "HSUPA";
                case TelephonyManager.NETWORK_TYPE_HSPA:
                    return "HSPA";
                case TelephonyManager.NETWORK_TYPE_EDGE:
                    return "EDGE";
                case TelephonyManager.NETWORK_TYPE_CDMA:
                    return "CDMA";
                case TelephonyManager.NETWORK_TYPE_1xRTT:
                    return "1xRTT";
                case TelephonyManager.NETWORK_TYPE_IDEN:
                    return "iDEN";
                case TelephonyManager.NETWORK_TYPE_EVDO_0:
                    return "EVDO rev. 0";
                case TelephonyManager.NETWORK_TYPE_EVDO_A:
                    return "EVDO rev. A";
                case TelephonyManager.NETWORK_TYPE_EVDO_B:
                    return "EVDO rev. B";
                case TelephonyManager.NETWORK_TYPE_NR:
                    return "5G";
                default:
                    return "Unknown";
            }
        } catch (Exception e) {
            return "Unknown";
        }
    }

    @SuppressLint("MissingPermission")
    public int getSignalStrength() {
        try {
            SignalStrength signalStrength = telephonyManager.getSignalStrength();
            if (signalStrength != null) {
                for (CellInfo cellInfo : telephonyManager.getAllCellInfo()) {
                    if (cellInfo instanceof CellInfoGsm) {
                        CellInfoGsm cellInfoGsm = (CellInfoGsm) cellInfo;
                        return cellInfoGsm.getCellSignalStrength().getLevel() * 25; // Scale to 0-100%
                    }
                }
            }
            return -1;  // Return -1 if signal strength is not available
        } catch (Exception e) {
            return -1;
        }
        }
}
