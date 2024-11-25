import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { AugmentOSParser, AugmentOSMainStatus } from './AugmentOSStatusParser';
import { bluetoothService } from './BluetoothService';

interface AugmentOSStatusContextType {
    status: AugmentOSMainStatus;
    isSearching: boolean;
    refreshStatus: (data: any) => void;
}

const AugmentOSStatusContext = createContext<AugmentOSStatusContextType | undefined>(undefined);

export const StatusProvider = ({ children }: { children: ReactNode }) => {
    const [status, setStatus] = useState(AugmentOSParser.parseStatus({}));
    const [isSearching, setIsSearching] = useState(false);

    // Existing refreshStatus logic
    const refreshStatus = useCallback((data: any) => {
        console.log('Raw data received for parsing:', data);
        const parsedStatus = AugmentOSParser.parseStatus(data);
        console.log('Parsed status:', parsedStatus);
        setStatus(parsedStatus);
    }, []);

    useEffect(() => {
        // Existing logic for handling data received
        const handleDataReceived = (data: any) => {
            console.log('Handling received data.. refreshing status..');
            refreshStatus(data);
        };

        const handleDeviceDisconnected = () => {
            console.log('Device disconnected');
            setStatus(AugmentOSParser.defaultStatus);
        };

        const handleScanStarted = () => setIsSearching(true);
        const handleScanStopped = () => setIsSearching(false);

        bluetoothService.on('dataReceived', handleDataReceived);
        bluetoothService.on('scanStarted', handleScanStarted);
        bluetoothService.on('scanStopped', handleScanStopped);
        bluetoothService.on('deviceDisconnected', handleDeviceDisconnected);

        // Cleanup all event listeners
        return () => {
            bluetoothService.removeListener('dataReceived', handleDataReceived);
            bluetoothService.removeListener('scanStarted', handleScanStarted);
            bluetoothService.removeListener('scanStopped', handleScanStopped);
            bluetoothService.removeListener('deviceDisconnected', handleDeviceDisconnected);
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
