import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import AugmentOSParser from './AugmentOSStatusParser';

// Default dummy status data
const defaultParsedData = {
    status: {
      puck_battery_life: 25,
      charging_status: true,
      connected_glasses: {
        model_name: "Vuzix Z100",
        battery_life: 10,
      },
      wifi: { is_connected: true, ssid: "test-ssid", signal_strength: 75 },
      gsm: { is_connected: true, carrier: "T-Mobile", signal_strength: 85 },
      apps: [
        {
          name: "Language Learner",
          description: "A real-time translation and vocabulary builder.",
          is_running: true,
          is_foreground: true,
          package_name: "com.language.learner",
        },
        {
          name: "Navigation Assistant",
          description: "Provides step-by-step navigation instructions.",
          is_running: true,
          is_foreground: false,
          package_name: "com.navigation.assistant",
        },
        {
          name: "Weather App",
          description: "Displays current weather conditions.",
          is_running: false,
          is_foreground: false,
          package_name: "com.weather.app",
        },
      ],
    },
  };
  

interface AugmentOSStatusContextType {
    status: ReturnType<AugmentOSParser['getStatus']>;
    refreshStatus: (data: any) => void;
}

const AugmentOSStatusContext = createContext<AugmentOSStatusContextType | undefined>(undefined);

export const StatusProvider = ({ children }: { children: ReactNode }) => {
    const parser = new AugmentOSParser(); // Create the parser instance

    // Parse the default status data on initialization
    parser.parseStatus(defaultParsedData);

    const [status, setStatus] = useState(parser.getStatus()); // Use state to store status

    const refreshStatus = useCallback((data: any) => {
        parser.parseStatus(data); // Parse the new status
        setStatus(parser.getStatus()); // Update the state to trigger re-renders
    }, []);

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
