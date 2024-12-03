import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { AugmentOSParser, AugmentOSMainStatus } from './AugmentOSStatusParser';
import { bluetoothService } from './BluetoothService';
import { MOCK_CONNECTION } from './consts';

interface AugmentOSStatusContextType {
    status: AugmentOSMainStatus;
    isSearching: boolean;
    refreshStatus: (data: any) => void;
    screenMirrorItems: []
}

const AugmentOSStatusContext = createContext<AugmentOSStatusContextType | undefined>(undefined);

export const StatusProvider = ({ children }: { children: ReactNode }) => {
    const [status, setStatus] = useState(AugmentOSParser.parseStatus({}));
    const [isSearching, setIsSearching] = useState(false);
    const [screenMirrorItems, setScreenMirrorItems] = useState([]);

    const refreshStatus = useCallback((data: any) => {
        if (!(data && 'status' in data)) {return;}

        const parsedStatus = AugmentOSParser.parseStatus(data);
        console.log('Parsed status:', parsedStatus);
        setStatus(parsedStatus);
    }, []);

    useEffect(() => {
        const handleStatusUpdateReceived = (data: any) => {
            console.log('Handling received data.. refreshing status..');
            refreshStatus(data);
        };

        const handleDeviceDisconnected = () => {
            console.log('Device disconnected');
            setStatus(AugmentOSParser.defaultStatus);
        };

        const handleScanStarted = () => setIsSearching(true);
        const handleScanStopped = () => setIsSearching(false);

        if (!MOCK_CONNECTION) {
            bluetoothService.on('statusUpdateReceived', handleStatusUpdateReceived);
            bluetoothService.on('scanStarted', handleScanStarted);
            bluetoothService.on('scanStopped', handleScanStopped);
            bluetoothService.on('deviceDisconnected', handleDeviceDisconnected);
        }

        return () => {
            if (!MOCK_CONNECTION) {
                bluetoothService.removeListener('statusUpdateReceived', handleStatusUpdateReceived);
                bluetoothService.removeListener('scanStarted', handleScanStarted);
                bluetoothService.removeListener('scanStopped', handleScanStopped);
                bluetoothService.removeListener('deviceDisconnected', handleDeviceDisconnected);
            }
        };
    }, [refreshStatus]);

    return (
        <AugmentOSStatusContext.Provider value={{ status, isSearching, refreshStatus }}>
            {children}
        </AugmentOSStatusContext.Provider>
    );
};

export const useStatus = () => {
    const context = useContext(AugmentOSStatusContext);
    if (!context) {
        throw new Error('useStatus must be used within a StatusProvider');
    }
    return context;
};
