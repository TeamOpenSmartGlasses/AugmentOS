import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import {AugmentOSParser, AugmentOSMainStatus} from './AugmentOSStatusParser';
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

    const refreshStatus = useCallback((data: any) => {
        const parsedStatus = AugmentOSParser.parseStatus(data);
        console.log("\n\nPARSED STATUS: ", parsedStatus);
        setStatus(parsedStatus);
    }, []);

    useEffect(() => {
        const handleDataReceived = (data: any) => {
            console.log("Handling received data.. refreshing status..");
            refreshStatus(data);
        };

        const handleScanStarted = () => setIsSearching(true);
        const handleScanStopped = () => setIsSearching(false);

        bluetoothService.on('dataReceived', handleDataReceived);
        bluetoothService.on('scanStarted', handleScanStarted);
        bluetoothService.on('scanStopped', handleScanStopped);

        return () => {
            bluetoothService.removeListener('dataReceived', handleDataReceived);
            bluetoothService.removeListener('scanStarted', handleScanStarted);
            bluetoothService.removeListener('scanStopped', handleScanStopped);
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