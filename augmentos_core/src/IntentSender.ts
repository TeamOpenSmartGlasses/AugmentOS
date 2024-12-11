// ManagerApp/src/IntentSender.ts

import { NativeModules } from 'react-native';

const { IntentSender } = NativeModules;

interface ProtocolData {
  version: string;
  action: string;
  request_id?: string;
  parameters?: {
    app_id?: string;
    setting_key?: string;
    setting_value?: string | number | boolean;
  };
}

const sendProtocolIntent = async (protocolData: ProtocolData): Promise<void> => {
  try {
    const jsonPayload = JSON.stringify(protocolData);
    IntentSender.sendIntent(jsonPayload);
    console.log('Intent sent successfully');
  } catch (error) {
    console.error('Error sending intent:', error);
  }
};

export default sendProtocolIntent;
