import { AppI } from '@shared/models/app';
import { GlassesToCloudMessage } from '@shared/websocket/client';
import { useState, useEffect, useCallback } from 'react';

interface ActiveApp {
  appId: string;
  name: string;
  tpaSessionId?: string;
  status: 'starting' | 'active' | 'error';
}

export const useAppManagement = (
  sessionId: string | null,
  sendMessage: (message: GlassesToCloudMessage) => void
) => {
  const [availableApps, setAvailableApps] = useState<AppI[]>([]);
  const [activeApps, setActiveApps] = useState<ActiveApp[]>([]);

  // Fetch available apps on mount and when sessionId changes
  useEffect(() => {
    const fetchApps = async () => {
      try {
        const response = await fetch('http://localhost:7002/apps');
        const apps = await response.json();
        setAvailableApps(apps);
      } catch (error) {
        console.error('Error fetching apps:', error);
      }
    };

    fetchApps();
  }, [sessionId]);

  const startApp = useCallback(async (appId: string) => {
    if (!sessionId) return;

    try {
      setActiveApps(prev => [
        ...prev,
        {
          appId,
          name: availableApps.find(a => a.appId === appId)?.name || appId,
          status: 'starting'
        }
      ]);

      console.log(`Starting app ${appId}... sessionId: ${sessionId}`);
      const response = await fetch(`http://localhost:7002/apps/${appId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });

      const result = await response.json();

      if (response.ok) {
        setActiveApps(prev =>
          prev.map(app =>
            app.appId === appId
              ? { ...app, status: 'active', tpaSessionId: result.tpaSessionId }
              : app
          )
        );

        // Notify WebSocket about app start
        sendMessage({ type: 'start_app', appId });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`Error starting app ${appId}:`, error);
      setActiveApps(prev =>
        prev.map(app =>
          app.appId === appId ? { ...app, status: 'error' } : app
        )
      );
    }
  }, [sessionId, availableApps, sendMessage]);

  const stopApp = useCallback(async (appId: string) => {
    if (!sessionId) return;

    try {
      // Notify WebSocket about app stop
      sendMessage({
        type: 'stop_app',
        appId,
        sessionId
      });

      setActiveApps(prev => prev.filter(app => app.appId !== appId));
    } catch (error) {
      console.error(`Error stopping app ${appId}:`, error);
    }
  }, [sessionId, sendMessage]);

  return {
    availableApps,
    activeApps,
    startApp,
    stopApp
  };
};