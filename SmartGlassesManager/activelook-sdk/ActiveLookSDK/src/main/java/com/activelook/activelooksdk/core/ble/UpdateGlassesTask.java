package com.activelook.activelooksdk.core.ble;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;
import android.util.Log;

import androidx.core.util.Consumer;
import androidx.core.util.Pair;
import androidx.core.util.Predicate;

import com.activelook.activelooksdk.DiscoveredGlasses;
import com.activelook.activelooksdk.Glasses;
import com.activelook.activelooksdk.types.ConfigurationElementsInfo;
import com.activelook.activelooksdk.types.DeviceInformation;
import com.activelook.activelooksdk.types.GlassesUpdate;
import com.activelook.activelooksdk.types.GlassesVersion;
import com.activelook.activelooksdk.types.Utils;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

@SuppressLint("DefaultLocale")
class UpdateGlassesTask {

    static final String BASE_URL = "http://vps468290.ovh.net/v1";
    static final int FW_COMPAT = 4;

    static final int BLOCK_SIZE = 240;

    private final RequestQueue requestQueue;
    private final String token;
    private final GlassesImpl glasses;
    private final DiscoveredGlasses discoveredGlasses;
    private final GlassesVersion gVersion;
    private UpdateProgress progress;

    private final Consumer<android.util.Pair<GlassesUpdate, Runnable>> onUpdateAvailableCallback;
    private final Consumer<Glasses> onConnected;
    private final Consumer<DiscoveredGlasses> onConnectionFail;

    private final Consumer<GlassesUpdate> onUpdateStartCallback;
    private final Consumer<GlassesUpdate> onUpdateProgressCallback;
    private final Consumer<GlassesUpdate> onUpdateSuccessCallback;
    private final Consumer<GlassesUpdate> onUpdateErrorCallback;

    // private int suotaVersion = 0;
    private int suotaPatchDataSize = 20;
    private int suotaMtu = 23;
    // private int suotaL2capPsm = 0;

    private final AtomicBoolean setSpotaGpioMapReady = new AtomicBoolean(false);
    private final AtomicBoolean sendEndSignalReady = new AtomicBoolean(true);

    private Firmware firmware;
    private List<Pair<Integer, List<byte[]>>> blocks;
    private int blockId;
    private int chunkId;
    private int patchLength;

    private void onUpdateStart(final UpdateProgress progress) {
        this.progress = progress.withProgress(0);
        this.onUpdateStartCallback.accept(this.progress);
    }
    private void onUpdateProgress(final UpdateProgress progress) {
        this.progress = progress;
        this.onUpdateProgressCallback.accept(this.progress);
    }
    private void onUpdateSuccess(final UpdateProgress progress) {
        this.progress = progress.withProgress(100);
        this.onUpdateSuccessCallback.accept(this.progress);
    }
    private void onUpdateError(final UpdateProgress progress) {
        this.progress = progress;
        this.onUpdateErrorCallback.accept(this.progress);
    }

    UpdateGlassesTask(
            final RequestQueue requestQueue,
            final String token,
            final DiscoveredGlasses discoveredGlasses,
            final GlassesImpl glasses,
            final Consumer<android.util.Pair<GlassesUpdate, Runnable>> onUpdateAvailableCallback,
            final Consumer<Glasses> onConnected,
            final Consumer<DiscoveredGlasses> onConnectionFail,
            final Consumer<GlassesUpdate> onUpdateStart,
            final Consumer<GlassesUpdate> onUpdateProgress,
            final Consumer<GlassesUpdate> onUpdateSuccess,
            final Consumer<GlassesUpdate> onUpdateError) {
        this.requestQueue = requestQueue;
        this.token = token;
        this.discoveredGlasses = discoveredGlasses;
        this.glasses = glasses;
        this.onUpdateAvailableCallback = onUpdateAvailableCallback;
        this.onConnected = onConnected;
        this.onConnectionFail = onConnectionFail;
        this.onUpdateStartCallback = onUpdateStart;
        this.onUpdateProgressCallback = onUpdateProgress;
        this.onUpdateSuccessCallback = onUpdateSuccess;
        this.onUpdateErrorCallback = onUpdateError;

        this.glasses.unsubscribeToFlowControlNotifications();
        this.glasses.unsubscribeToSensorInterfaceNotifications();
        this.glasses.unsubscribeToBatteryLevelNotifications();

        final DeviceInformation gInfo = glasses.getDeviceInformation();
        this.gVersion = new GlassesVersion(gInfo.getFirmwareVersion());

        final String strVersion = String.format("%d.%d.%d", this.gVersion.getMajor(), this.gVersion.getMinor(), this.gVersion.getPatch());

        this.progress = new UpdateProgress(discoveredGlasses, GlassesUpdate.State.DOWNLOADING_FIRMWARE, 0,
                this.glasses.getDeviceInformation().getBatteryLevel(),
                strVersion, String.format("%d.0.0", FW_COMPAT), "", "");

        if (this.gVersion.getMajor() > FW_COMPAT) {
            this.onUpdateError(this.progress.withStatus(GlassesUpdate.State.ERROR_DOWNGRADE_FORBIDDEN));
            this.onConnectionFail.accept(this.discoveredGlasses);
            return;
        }

        Log.d("UPDATE", String.format("Create update task for: %s", gInfo));

        final String fwHistoryURL = String.format("%s/firmwares/%s/%s?compatibility=%d&min-version=%s",
                BASE_URL, gInfo.getHardwareVersion(), this.token, FW_COMPAT, strVersion);

        this.requestQueue.add(new JsonObjectRequest(
                Request.Method.GET,
                fwHistoryURL,
                null,
                this::onFirmwareHistoryResponse,
                this::onApiFail
        ));
    }

    private void onApiFail(final VolleyError error) {
        error.printStackTrace();
        if (error.networkResponse != null && error.networkResponse.statusCode == HttpURLConnection.HTTP_FORBIDDEN) {
            this.onUpdateError(this.progress.withStatus(GlassesUpdate.State.ERROR_UPDATE_FORBIDDEN));
            this.onConnectionFail.accept(this.discoveredGlasses);
        } else {
            this.onApiJSONException(null);
        }
    }

    private void onApiJSONException(final JSONException error) {
        if (error != null) {
            error.printStackTrace();
        }
        this.onUpdateError(this.progress.withStatus(GlassesUpdate.State.ERROR_UPDATE_FAIL));
        if (this.gVersion.getMajor() < FW_COMPAT) {
            this.onConnectionFail.accept(this.discoveredGlasses);
        } else {
            this.onConnected.accept(this.glasses);
        }
    }

    private void onBluetoothError() {
        Log.e("SUOTA", "Got onBluetoothError");
        this.onUpdateError(this.progress.withStatus(GlassesUpdate.State.ERROR_UPDATE_FAIL));
        this.onConnectionFail.accept(this.discoveredGlasses);
    }

    private void onCharacteristicError(final BluetoothGattCharacteristic characteristic) {
        final Object obj = characteristic == null ? "null" : characteristic.getUuid();
        Log.e("SUOTA", String.format("Got onCharacteristicError %s", obj));
        this.onUpdateError(this.progress.withStatus(GlassesUpdate.State.ERROR_UPDATE_FAIL));
        this.onConnectionFail.accept(this.discoveredGlasses);
    }

    void onFirmwareHistoryResponse(final JSONObject jsonObject) {
        try {
            final JSONObject latest = jsonObject.getJSONObject("latest");
            Log.d("FW_LATEST", String.format("%s", latest));
            final JSONArray lVersion = latest.getJSONArray("version");
            final int major = lVersion.getInt(0);
            final int minor = lVersion.getInt(1);
            final int patch = lVersion.getInt(2);
            final String strVersion = String.format("%d.%d.%d", major, minor, patch);
            this.progress = this.progress.withTargetFirmwareVersion(strVersion);
            if (
                    major > this.gVersion.getMajor()
                            || (major == this.gVersion.getMajor() && minor >  this.gVersion.getMinor())
                            || (major == this.gVersion.getMajor() && minor == this.gVersion.getMinor() && patch > this.gVersion.getPatch())
            ) {
                final String latestApiPath = String.format("/firmwares/%s/%s/%s", this.glasses.getDeviceInformation().getHardwareVersion(), this.token, strVersion);
                final int bl0 = this.glasses.getDeviceInformation().getBatteryLevel();
                if (bl0 < 10) {
                    this.onBatteryLevelNotification(latestApiPath, bl0);
                    this.glasses.subscribeToBatteryLevelNotifications(bl -> this.onBatteryLevelNotification(latestApiPath, bl));
                } else {
                    this.resumeOnFirmwareHistoryResponse(latestApiPath);
                }
            } else {
                Log.d("FW_LATEST", "No firmware update available");
                this.glasses.subscribeToFlowControlNotifications(fc -> {
                    this.glasses.unsubscribeToFlowControlNotifications();
                    this.glasses.cfgRead("ALooK", info -> {
                        final String gStrVersion = String.format("%d.%d.%d", this.gVersion.getMajor(), this.gVersion.getMinor(), this.gVersion.getPatch());

                        final String cfgHistoryURL = String.format("%s/configurations/%s/%s?compatibility=%d&max-version=%s",
                                BASE_URL, this.glasses.getDeviceInformation().getHardwareVersion(), this.token, FW_COMPAT, gStrVersion);

                        this.requestQueue.add(new JsonObjectRequest(
                                Request.Method.GET,
                                cfgHistoryURL,
                                null,
                                r -> this.onConfigurationHistoryResponse(r, info),
                                this::onApiFail
                        ));
                    });
                });
                final byte [] fcError = new byte [532];
                fcError[0] = (byte) 0xFF;
                this.glasses.writeBytes(fcError);
            }
        } catch (final JSONException e) {
            this.onApiJSONException(e);
        }
    }

    private void onBatteryLevelNotification(final String latestApiPath, final int batteryLevel) {
        if (batteryLevel < 10) {
            this.onUpdateError(this.progress.withBatteryLevel(batteryLevel).withStatus(GlassesUpdate.State.ERROR_UPDATE_FAIL_LOW_BATTERY));
        } else {
            this.glasses.subscribeToBatteryLevelNotifications(bl -> this.onUpdateProgress(this.progress.withBatteryLevel(bl)));
            this.resumeOnFirmwareHistoryResponse(latestApiPath);
        }
    }

    private void resumeOnFirmwareHistoryResponse(final String latestApiPath) {
        this.onUpdateStart(this.progress.withStatus(GlassesUpdate.State.DOWNLOADING_FIRMWARE));
        this.requestQueue.add(new FileRequest(
                String.format("%s%s", BASE_URL, latestApiPath),
                this::onFirmwareDownloaded,
                this::onApiFail
        ));
    }

    private void onConfigurationHistoryResponse(final JSONObject jsonObject, final ConfigurationElementsInfo info) {
        try {
            final JSONObject latest = jsonObject.getJSONObject("latest");
            Log.d("CFG_LATEST", String.format("%s", latest));
            final JSONArray lVersion = latest.getJSONArray("version");
            final int major = lVersion.getInt(0);
            final int minor = lVersion.getInt(1);
            final int patch = lVersion.getInt(2);
            final int version = lVersion.getInt(3);
            this.progress = this.progress
                    .withSourceConfigurationVersion(String.format("%d", info.getVersion()))
                    .withTargetConfigurationVersion(String.format("%d", version));
            if (version > info.getVersion()) {
                this.onUpdateStart(this.progress.withStatus(GlassesUpdate.State.DOWNLOADING_CONFIGURATION));
                final String strVersion = String.format("%d.%d.%d.%d", major, minor, patch, version);
                final String latestApiPath = String.format("/configurations/%s/%s/%s", this.glasses.getDeviceInformation().getHardwareVersion(), this.token, strVersion);
                this.requestQueue.add(new FileRequest(
                        String.format("%s%s", BASE_URL, latestApiPath),
                        this::onConfigurationDownloaded,
                        this::onApiFail
                ));
            } else {
                Log.d("CFG_LATEST", "No configuration update available");
                this.onUpdateSuccess(this.progress);
                this.onConnected.accept(this.glasses);
            }
        } catch (final JSONException e) {
            this.onApiJSONException(e);
        }
    }

    private void onConfigurationDownloaded(final byte[] response) {
        this.onUpdateProgress(this.progress.withStatus(GlassesUpdate.State.UPDATING_CONFIGURATION).withProgress(0));
        Log.d("CFG DOWNLOADER", String.format("bytes: [%d] %s", response.length, Arrays.toString(response)));
        try {
            this.glasses.cfgSet("ALooK");
            this.glasses.clear();
            this.glasses.layoutDisplay((byte) 0x09, "");

            final ArrayList<String> lines = new ArrayList<>();
            final BufferedReader bReader = new BufferedReader(new InputStreamReader(new ByteArrayInputStream(response)));
            String line;
            while ((line = bReader.readLine()) != null) {
                lines.add(line);
            }
            final int nbLines = lines.size();
            for (int i = 0; i < nbLines; i++) {
                final int idxLine = i;
                this.glasses.gattCallbacks.writeRxCharacteristic(
                    Utils.hexStringToBytes(lines.get(idxLine)),
                    p -> UpdateGlassesTask.this.onUpdateProgress(progress.withProgress((idxLine + p) * 100d / nbLines))
                );
            }

            this.glasses.clear();
            this.glasses.cfgRead("ALooK", info -> {
                this.onUpdateSuccess(this.progress);
                this.onConnected.accept(this.glasses);
            });
        } catch (IOException e) {
            this.onUpdateError(this.progress.withStatus(GlassesUpdate.State.ERROR_UPDATE_FAIL));
            this.onConnectionFail.accept(this.discoveredGlasses);
        }
    }

    private void onFirmwareDownloaded(final byte[] response) {
        this.onUpdateProgress(progress.withStatus(GlassesUpdate.State.UPDATING_FIRMWARE).withProgress(0));
        this.onUpdateAvailableCallback.accept(new android.util.Pair<>(this.progress, ()->{
            Log.d("FIRMWARE DOWNLOADER", String.format("bytes: [%d] %s", response.length, Arrays.toString(response)));
            this.firmware = new Firmware(response);
            this.suotaUpdate(this.glasses.gattCallbacks);
        }));
        /*if(!this.onUpdateAvailableCallback.test(this.progress)) {
            this.glasses.unsubscribeToBatteryLevelNotifications();
            this.onUpdateError(this.progress.withStatus(GlassesUpdate.State.ERROR_UPDATE_FAIL));
            this.onConnectionFail.accept(this.discoveredGlasses);
            return;
        }*/
    }

    private void suotaUpdate(final GlassesGatt gatt) {
        this.suotaRead_SUOTA_VERSION_UUID(gatt);
    }

    private void suotaRead_SUOTA_VERSION_UUID(final GlassesGatt gatt) {
        final BluetoothGattService service = gatt.getService(GlassesGatt.SPOTA_SERVICE_UUID);
        gatt.readCharacteristic(
                service.getCharacteristic(GlassesGatt.SUOTA_VERSION_UUID),
                c -> {
                    // this.suotaVersion = c.getIntValue(BluetoothGattCharacteristic.FORMAT_UINT8, 0);
                    this.suotaRead_SUOTA_PATCH_DATA_CHAR_SIZE_UUID(gatt, service);
                },
                this::onCharacteristicError);
    }

    private void suotaRead_SUOTA_PATCH_DATA_CHAR_SIZE_UUID(final GlassesGatt gatt, final BluetoothGattService service) {
        gatt.readCharacteristic(
                service.getCharacteristic(GlassesGatt.SUOTA_PATCH_DATA_CHAR_SIZE_UUID),
                c -> {
                    this.suotaPatchDataSize = c.getIntValue(BluetoothGattCharacteristic.FORMAT_UINT16, 0);
                    this.suotaRead_SUOTA_MTU_UUID(gatt, service);
                },
                this::onCharacteristicError);
    }

    private void suotaRead_SUOTA_MTU_UUID(final GlassesGatt gatt, final BluetoothGattService service) {
        gatt.readCharacteristic(
                service.getCharacteristic(GlassesGatt.SUOTA_MTU_UUID),
                c -> {
                    this.suotaMtu = c.getIntValue(BluetoothGattCharacteristic.FORMAT_UINT16, 0);
                    this.suotaRead_SUOTA_L2CAP_PSM_UUID(gatt, service);
                },
                this::onCharacteristicError);
    }

    private void suotaRead_SUOTA_L2CAP_PSM_UUID(final GlassesGatt gatt, final BluetoothGattService service) {
        gatt.readCharacteristic(
                service.getCharacteristic(GlassesGatt.SUOTA_L2CAP_PSM_UUID),
                c -> {
                    // this.suotaL2capPsm = c.getIntValue(BluetoothGattCharacteristic.FORMAT_UINT16, 0);
                    this.enableNotifications(gatt, service);
                },
                this::onCharacteristicError);
    }

    private void enableNotifications(final GlassesGatt gatt, final BluetoothGattService service) {
        Log.d("SUOTA", "Enabling notification");
        gatt.setCharacteristicNotification(
                service.getCharacteristic(GlassesGatt.SPOTA_SERV_STATUS_UUID),
                true,
                () -> this.setSpotaMemDev(gatt, service),
                this::onBluetoothError,
                c -> this.onSuotaNotifications(gatt, service, c));
    }

    private void onSuotaNotifications(final GlassesGatt gatt, final BluetoothGattService service, final BluetoothGattCharacteristic characteristic) {
        int value = characteristic.getIntValue(BluetoothGattCharacteristic.FORMAT_UINT8, 0);
        Log.d("Suota notification", String.format("SPOTA_SERV_STATUS notification: %#04x", value));
        if (value == 0x10) {
            this.setSpotaGpioMap(gatt, service);
        } else if (value == 0x02) {
            this.setPatchLength(gatt, service);
        } else {
            Log.e("Suota notification", String.format("SPOTA_SERV_STATUS notification error: %#04x", value));
            this.onUpdateError(this.progress.withStatus(GlassesUpdate.State.ERROR_UPDATE_FORBIDDEN));
            this.onConnected.accept(this.glasses);
        }
    }

    private void setSpotaMemDev(final GlassesGatt gatt, final BluetoothGattService service) {
        final int memType = 0x13000000;
        Log.d("SPOTA", "setSpotaMemDev: " + String.format("%#010x", memType));
        final BluetoothGattCharacteristic characteristic = service.getCharacteristic(GlassesGatt.SPOTA_MEM_DEV_UUID);
        characteristic.setValue(memType, BluetoothGattCharacteristic.FORMAT_UINT32, 0);
        gatt.writeCharacteristic(
                characteristic,
                c -> {
                    Log.d("SPOTA", "Wait for notification for setSpotaMemDev.");
                    this.setSpotaGpioMap(gatt, service);
                },
                this::onCharacteristicError);
    }

    private void setSpotaGpioMap(final GlassesGatt gatt, final BluetoothGattService service) {
        if (this.setSpotaGpioMapReady.compareAndSet(false, true)) {
            return;
        }
        final int memInfoData = 0x05060300;
        Log.d("SPOTA", "setSpotaGpioMap: " + String.format("%#010x", memInfoData));
        final BluetoothGattCharacteristic characteristic = service.getCharacteristic(GlassesGatt.SPOTA_GPIO_MAP_UUID);
        characteristic.setValue(memInfoData, BluetoothGattCharacteristic.FORMAT_UINT32, 0);
        gatt.writeCharacteristic(
                characteristic,
                c -> {
                    final int chunkSize = Math.min(this.suotaPatchDataSize, this.suotaMtu - 3);
                    this.blocks = this.firmware.getSuotaBlocks(BLOCK_SIZE, chunkSize);
                    this.blockId = 0;
                    this.chunkId = 0;
                    this.patchLength = 0;
                    this.setPatchLength(gatt, service);
                },
                this::onCharacteristicError);
    }

    private void setPatchLength(final GlassesGatt gatt, final BluetoothGattService service) {
        if (this.blockId < this.blocks.size()) {
            final Pair<Integer, List<byte[]>> block = this.blocks.get(this.blockId);
            final int blockSize = block.first;
            if (blockSize != this.patchLength) {
                Log.d("SUOTA", "setPatchLength: " + blockSize + " - " + String.format("%#06x", blockSize));
                final BluetoothGattCharacteristic characteristic = service.getCharacteristic(GlassesGatt.SPOTA_PATCH_LEN_UUID);
                characteristic.setValue(blockSize, BluetoothGattCharacteristic.FORMAT_UINT16, 0);
                gatt.writeCharacteristic(
                        characteristic,
                        c -> {
                            this.patchLength = blockSize;
                            this.sendBlock(gatt, service);
                        },
                        this::onCharacteristicError);
            } else {
                this.sendBlock(gatt, service);
            }
        } else {
            this.sendEndSignal(gatt, service);
        }
    }

    private void sendBlock(final GlassesGatt gatt, final BluetoothGattService service) {
        if (this.blockId < this.blocks.size()) {
            final Pair<Integer, List<byte[]>> block = this.blocks.get(this.blockId);
            final List<byte[]> chunks = block.second;
            if (this.chunkId < chunks.size()) {
                Log.d("SUOTA", String.format("sendBlock %d chunk %d", this.blockId, this.chunkId));
                final BluetoothGattCharacteristic characteristic = service.getCharacteristic(GlassesGatt.SPOTA_PATCH_DATA_UUID);
                characteristic.setValue(chunks.get(this.chunkId++));
                characteristic.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);
                gatt.writeCharacteristic(
                        characteristic,
                        c -> this.sendBlock(gatt, service),
                        this::onCharacteristicError);
                final double ratioBlock = 100d * ( this.blockId + this.chunkId / (double) chunks.size()) / this.blocks.size();
                this.onUpdateProgress(progress.withProgress(ratioBlock));
            } else {
                this.blockId ++;
                this.chunkId = 0;
                Log.d("SPOTA", "Wait for notification for sendBlock.");
            }
        } else {
            this.sendEndSignal(gatt, service);
        }
    }

    private void sendEndSignal(final GlassesGatt gatt, final BluetoothGattService service) {
        if (!this.sendEndSignalReady.compareAndSet(true, false)) {
            return;
        }
        Log.d("SUOTA", "disable notification");
        gatt.setCharacteristicNotification(
                service.getCharacteristic(GlassesGatt.SPOTA_SERV_STATUS_UUID),
                false,
                () -> {
                    Log.d("SUOTA", "sendEndSignal");
                    final BluetoothGattCharacteristic characteristic = service.getCharacteristic(GlassesGatt.SPOTA_MEM_DEV_UUID);
                    characteristic.setValue(0xfe000000, BluetoothGattCharacteristic.FORMAT_UINT32, 0);
                    gatt.writeCharacteristic(
                            characteristic,
                            c -> this.sendRebootSignal(gatt, service),
                            this::onCharacteristicError);
                },
                this::onBluetoothError,
                c -> {
                    int value = c.getIntValue(BluetoothGattCharacteristic.FORMAT_UINT8, 0);
                    Log.d("Suota notification", String.format("SPOTA_SERV_STATUS notification ignored: %#04x", value));
                });
    }

    private void sendRebootSignal(final GlassesGatt gatt, final BluetoothGattService service) {
        Log.d("SUOTA", "unsubscribeToBatteryLevelNotifications");
        this.glasses.unsubscribeToBatteryLevelNotifications();
        Log.d("SUOTA", "sendRebootSignal");
        final BluetoothGattCharacteristic characteristic = service.getCharacteristic(GlassesGatt.SPOTA_MEM_DEV_UUID);
        characteristic.setValue(0xfd000000, BluetoothGattCharacteristic.FORMAT_UINT32, 0);
        if (gatt.writeCharacteristic(characteristic, null, null)) {
            this.onUpdateSuccess(progress);
        } else {
            this.onCharacteristicError(characteristic);
        }
    }

}
