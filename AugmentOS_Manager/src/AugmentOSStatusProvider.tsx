import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import AugmentOSParser from './AugmentOSStatusParser';

interface AugmentOSStatusContextType {
    status: ReturnType<AugmentOSParser['getStatus']>;
    refreshStatus: (data: any) => void;
}

const AugmentOSStatusContext = createContext<AugmentOSStatusContextType | undefined>(undefined);

export const StatusProvider = ({ children }: { children: ReactNode }) => {
    const parser = useMemo(() => new AugmentOSParser(), []); // Create parser instance without default data

    const [status, setStatus] = useState(parser.getStatus()); // Initialize with empty/default status

    const refreshStatus = useCallback((data: any) => {
        parser.parseStatus(data); // Parse the new status
        setStatus(parser.getStatus()); // Update the state to trigger re-renders
    }, [parser]);

    return (
        <AugmentOSStatusContext.Provider value={{ status, refreshStatus }}>
            {children}
        </AugmentOSStatusContext.Provider>
    );
};

// Custom hook to access the status context
export const useStatus = () => {
    const context = useContext(AugmentOSStatusContext);
    if (!context) {
        throw new Error('useStatus must be used within a StatusProvider');
    }
    return context;
};
