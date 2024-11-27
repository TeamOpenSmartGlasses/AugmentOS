package com.activelook.activelooksdk.core.ble;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.content.Context;

import androidx.core.util.Consumer;

import java.util.HashMap;
import java.util.List;
import java.util.UUID;

@SuppressLint("MissingPermission")
class GlassesGatt extends BluetoothGattCallback {

    private static final UUID NOTIFICATION_DESCRIPTOR = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

    public static final UUID SPOTA_SERVICE_UUID = UUID.fromString("0000fef5-0000-1000-8000-00805f9b34fb");
    public static final UUID SPOTA_SERV_STATUS_UUID = UUID.fromString("5f78df94-798c-46f5-990a-b3eb6a065c88");
    public static final UUID SPOTA_MEM_DEV_UUID = UUID.fromString("8082caa8-41a6-4021-91c6-56f9b954cc34");
    public static final UUID SPOTA_GPIO_MAP_UUID = UUID.fromString("724249f0-5eC3-4b5f-8804-42345af08651");
    public static final UUID SPOTA_PATCH_LEN_UUID = UUID.fromString("9d84b9a3-000c-49d8-9183-855b673fda31");
    public static final UUID SPOTA_PATCH_DATA_UUID = UUID.fromString("457871e8-d516-4ca1-9116-57d0b17b9cb2");

    public static final UUID SUOTA_VERSION_UUID = UUID.fromString("64B4E8B5-0DE5-401B-A21D-ACC8DB3B913A");
    public static final UUID SUOTA_PATCH_DATA_CHAR_SIZE_UUID = UUID.fromString("42C3DFDD-77BE-4D9C-8454-8F875267FB3B");
    public static final UUID SUOTA_MTU_UUID = UUID.fromString("B7DE1EEA-823D-43BB-A3AF-C4903DFCE23C");
    public static final UUID SUOTA_L2CAP_PSM_UUID = UUID.fromString("61C8849C-F639-4765-946E-5C3419BEBB2A");

    protected BluetoothGatt gattDelegate;

    private final HashMap<BluetoothGattDescriptor, Runnable> onDescriptorWritesSuccess;
    private final HashMap<BluetoothGattDescriptor, Runnable> onDescriptorWritesError;

    private final HashMap<BluetoothGattCharacteristic, Consumer<BluetoothGattCharacteristic>> onCharacteristicReadsSuccess;
    private final HashMap<BluetoothGattCharacteristic, Consumer<BluetoothGattCharacteristic>> onCharacteristicReadsError;

    private final HashMap<BluetoothGattCharacteristic, Consumer<BluetoothGattCharacteristic>> onCharacteristicWritesSuccess;
    private final HashMap<BluetoothGattCharacteristic, Consumer<BluetoothGattCharacteristic>> onCharacteristicWritesError;

    private final HashMap<BluetoothGattCharacteristic, Consumer<BluetoothGattCharacteristic>> onCharacteristicChanges;

    GlassesGatt(
            final Context context,
            final BluetoothDevice device,
            final boolean autoConnect) {
        super();
        this.gattDelegate = device.connectGatt(context, autoConnect, this);
        this.onDescriptorWritesSuccess = new HashMap<>();
        this.onDescriptorWritesError = new HashMap<>();
        this.onCharacteristicReadsSuccess = new HashMap<>();
        this.onCharacteristicReadsError = new HashMap<>();
        this.onCharacteristicWritesSuccess = new HashMap<>();
        this.onCharacteristicWritesError = new HashMap<>();
        this.onCharacteristicChanges = new HashMap<>();
    }

    void reconnect(
            final Context context,
            final BluetoothDevice device,
            final boolean autoConnect) {
        this.onDescriptorWritesSuccess.clear();
        this.onDescriptorWritesError.clear();
        this.onCharacteristicReadsSuccess.clear();
        this.onCharacteristicReadsError.clear();
        this.onCharacteristicWritesSuccess.clear();
        this.onCharacteristicWritesError.clear();
        this.onCharacteristicChanges.clear();
        this.gattDelegate = device.connectGatt(context, autoConnect, this);
    }

    void close() {
        gattDelegate.close();
    }

    void disconnect() {
        gattDelegate.disconnect();
    }

    boolean connect() {
        return gattDelegate.connect();
    }

    BluetoothDevice getDevice() {
        return gattDelegate.getDevice();
    }

    boolean discoverServices() {
        return gattDelegate.discoverServices();
    }

    List<BluetoothGattService> getServices() {
        return gattDelegate.getServices();
    }

    BluetoothGattService getService(UUID uuid) {
        return gattDelegate.getService(uuid);
    }

    boolean readCharacteristic(
            final BluetoothGattCharacteristic characteristic,
            final Consumer<BluetoothGattCharacteristic> onSuccess,
            final Consumer<BluetoothGattCharacteristic> onError) {
        if (characteristic == null) {
            if (onError != null) onError.accept(null);
            return false;
        }
        if (onSuccess != null) this.onCharacteristicReadsSuccess.put(characteristic, onSuccess);
        if (onError != null) this.onCharacteristicReadsError.put(characteristic, onError);
        if (this.gattDelegate.readCharacteristic(characteristic)) {
            return true;
        }
        if (onSuccess != null) this.onCharacteristicReadsSuccess.remove(characteristic);
        if (onError != null) {
            this.onCharacteristicReadsError.remove(characteristic);
            onError.accept(characteristic);
        }
        return false;
    }

    boolean writeCharacteristic(
            final BluetoothGattCharacteristic characteristic,
            final Consumer<BluetoothGattCharacteristic> onSuccess,
            final Consumer<BluetoothGattCharacteristic> onError) {
        if (characteristic == null) {
            if (onError != null) onError.accept(null);
            return false;
        }
        if (this.onCharacteristicWritesSuccess.containsKey(characteristic) || this.onCharacteristicWritesError.containsKey(characteristic)) {
            if (onError != null) {
                onError.accept(characteristic);
            }
            return false;
        }
        if (onSuccess != null) this.onCharacteristicWritesSuccess.put(characteristic, onSuccess);
        if (onError != null) this.onCharacteristicWritesError.put(characteristic, onError);
        if (this.gattDelegate.writeCharacteristic(characteristic)) {
            return true;
        }
        if (onSuccess != null) this.onCharacteristicWritesSuccess.remove(characteristic);
        if (onError != null) {
            this.onCharacteristicWritesError.remove(characteristic);
            onError.accept(characteristic);
        }
        return false;
    }

    boolean readDescriptor(BluetoothGattDescriptor descriptor) {
        return gattDelegate.readDescriptor(descriptor);
    }

    boolean writeDescriptor(BluetoothGattDescriptor descriptor) {
        return gattDelegate.writeDescriptor(descriptor);
    }

    boolean beginReliableWrite() {
        return gattDelegate.beginReliableWrite();
    }

    boolean executeReliableWrite() {
        return gattDelegate.executeReliableWrite();
    }

    void abortReliableWrite() {
        gattDelegate.abortReliableWrite();
    }

    boolean setCharacteristicNotification(
            final BluetoothGattCharacteristic characteristic,
            final boolean enable,
            final Runnable onSuccess,
            final Runnable onError,
            final Consumer<BluetoothGattCharacteristic> onChange) {
        final BluetoothGattDescriptor descriptor = characteristic.getDescriptor(NOTIFICATION_DESCRIPTOR);
        if (descriptor != null) {
            if (onSuccess != null) this.onDescriptorWritesSuccess.put(descriptor, onSuccess);
            if (onError != null) this.onDescriptorWritesError.put(descriptor, onError);
            if (onChange != null) this.onCharacteristicChanges.put(characteristic, onChange);
            if (this.gattDelegate.setCharacteristicNotification(characteristic, enable)) {
                descriptor.setValue(
                        enable
                        ? BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                        : BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE);
                if (this.gattDelegate.writeDescriptor(descriptor)) {
                    return true;
                }
            }
            if (onSuccess != null) this.onDescriptorWritesSuccess.remove(descriptor);
            if (onError != null) this.onDescriptorWritesError.remove(descriptor);
            if (onChange != null) this.onCharacteristicChanges.remove(characteristic);
        }
        if (onError != null) onError.run();
        return false;
    }

    boolean readRemoteRssi() {
        return gattDelegate.readRemoteRssi();
    }

    boolean requestMtu(int mtu) {
        return gattDelegate.requestMtu(mtu);
    }

    boolean requestConnectionPriority(int connectionPriority) {
        return gattDelegate.requestConnectionPriority(connectionPriority);
    }

    int getConnectionState(BluetoothDevice device) {
        return gattDelegate.getConnectionState(device);
    }

    List<BluetoothDevice> getConnectedDevices() {
        return gattDelegate.getConnectedDevices();
    }

    List<BluetoothDevice> getDevicesMatchingConnectionStates(int[] states) {
        return gattDelegate.getDevicesMatchingConnectionStates(states);
    }

    // BluetoothGattCallback
    @Override
    public void onPhyUpdate(BluetoothGatt gatt, int txPhy, int rxPhy, int status) {
        super.onPhyUpdate(gatt, txPhy, rxPhy, status);
    }

    @Override
    public void onPhyRead(BluetoothGatt gatt, int txPhy, int rxPhy, int status) {
        super.onPhyRead(gatt, txPhy, rxPhy, status);
    }

    @Override
    public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
        super.onConnectionStateChange(gatt, status, newState);
    }

    @Override
    public void onServicesDiscovered(BluetoothGatt gatt, int status) {
        super.onServicesDiscovered(gatt, status);
    }

    @Override
    public void onCharacteristicRead(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
        assert this.gattDelegate == gatt;
        super.onCharacteristicRead(gatt, characteristic, status);
        final Consumer<BluetoothGattCharacteristic> onSuccess = this.onCharacteristicReadsSuccess.remove(characteristic);
        final Consumer<BluetoothGattCharacteristic> onError = this.onCharacteristicReadsError.remove(characteristic);
        if (status == BluetoothGatt.GATT_SUCCESS) {
            if (onSuccess != null) onSuccess.accept(characteristic);
        } else if (onError != null) onError.accept(characteristic);
    }

    @Override
    public void onCharacteristicWrite(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
        assert this.gattDelegate == gatt;
        super.onCharacteristicWrite(gatt, characteristic, status);
        final Consumer<BluetoothGattCharacteristic> onSuccess = this.onCharacteristicWritesSuccess.remove(characteristic);
        final Consumer<BluetoothGattCharacteristic> onError = this.onCharacteristicWritesError.remove(characteristic);
        if (status == BluetoothGatt.GATT_SUCCESS) {
            if (onSuccess != null) onSuccess.accept(characteristic);
        } else if (onError != null) onError.accept(characteristic);
    }

    @Override
    public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
        assert this.gattDelegate == gatt;
        super.onCharacteristicChanged(gatt, characteristic);
        final Consumer<BluetoothGattCharacteristic> onChange = this.onCharacteristicChanges.get(characteristic);
        if (onChange != null) onChange.accept(characteristic);
    }

    @Override
    public void onDescriptorRead(BluetoothGatt gatt, BluetoothGattDescriptor descriptor, int status) {
        super.onDescriptorRead(gatt, descriptor, status);
    }

    @Override
    public void onDescriptorWrite(
            final BluetoothGatt gatt,
            final BluetoothGattDescriptor descriptor,
            final int status) {
        assert this.gattDelegate == gatt;
        super.onDescriptorWrite(gatt, descriptor, status);
        final Runnable onSuccess = this.onDescriptorWritesSuccess.remove(descriptor);
        final Runnable onError = this.onDescriptorWritesError.remove(descriptor);
        if (status == BluetoothGatt.GATT_SUCCESS) {
            if (onSuccess != null) onSuccess.run();
        } else if (onError != null) onError.run();
    }

    @Override
    public void onReliableWriteCompleted(BluetoothGatt gatt, int status) {
        super.onReliableWriteCompleted(gatt, status);
    }

    @Override
    public void onReadRemoteRssi(BluetoothGatt gatt, int rssi, int status) {
        super.onReadRemoteRssi(gatt, rssi, status);
    }

    @Override
    public void onMtuChanged(BluetoothGatt gatt, int mtu, int status) {
        super.onMtuChanged(gatt, mtu, status);
    }

    @Override
    public void onServiceChanged(BluetoothGatt gatt) {
        super.onServiceChanged(gatt);
    }

}
