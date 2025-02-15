/* eslint-disable no-case-declarations */
import {
  Layout,
  WebSocketMessage,
  GlassesConnectionInitMessage,
  CloudConnectionAckMessage,
  CloudDisplayEventMessage,
  CloudConnectionErrorMessage
} from '@augmentos/types';
import { useState, useRef, useCallback, useEffect } from 'react';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentLayout, setCurrentLayout] = useState<Layout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data as string) as WebSocketMessage;
      console.log('Received message:', message);
      switch (message.type) {
        case 'connection_ack':
          const ackMessage = message as CloudConnectionAckMessage;
          setSessionId(ackMessage.sessionId);
          console.log('Connected to session ⚡️🚀⚡️⚡️⚡️⚡️:', ackMessage);
          setIsConnected(true);
          break;

        case 'display_event':
          const displayEvent = message as CloudDisplayEventMessage;
          setCurrentLayout(displayEvent.layout);
          break;

        case 'connection_error':
          const errorMsg = message as CloudConnectionErrorMessage;
          console.error('Connection Error:', errorMsg.message);
          disconnect();
          break;
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      wsRef.current = new WebSocket('ws://localhost:7002/glasses-ws');
      wsRef.current.binaryType = 'arraybuffer';

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        const initMessage: GlassesConnectionInitMessage = {
          type: 'connection_init',
          // userId: 'isaiahballah@gmail.com'
          coreToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0YmZjYjEwZC1kZTY0LTRjNjgtYTZlNi1iOTY5YTI1NTkzNWEiLCJlbWFpbCI6ImFsZXgxMTE1YWxleEBnbWFpbC5jb20iLCJpYXQiOjE3Mzk1NjA5MTR9.sxnJCHn52FaLm5p_BtgAQfudMWUaB-Uktxtrwzd_R8E'

        };
        wsRef.current?.send(JSON.stringify(initMessage));
      };

      wsRef.current.onmessage = handleMessage;
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket closed');
        disconnect();
      };
    } catch (error) {
      console.error('Error connecting:', error);
    }
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsConnected(false);
    setSessionId(null);
    setCurrentLayout(null);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    sessionId,
    currentLayout,
    connect,
    disconnect,
    sendMessage,
    websocket: wsRef.current
  };
};