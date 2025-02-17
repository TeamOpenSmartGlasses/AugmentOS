// In BackendServerComms.ts
import axios, { AxiosRequestConfig } from 'axios';
import { Config } from 'react-native-config';

interface Callback {
  onSuccess: (data: any) => void;
  onFailure: (errorCode: number) => void;
}

export default class BackendServerComms {
  private static instance: BackendServerComms;
  private TAG = 'MXT2_BackendServerComms';
  private serverUrl: string;

  private getServerUrl(): string {
    const secure = Config.AUGMENTOS_SECURE === 'true';
    const host = Config.AUGMENTOS_HOST;
    const port = Config.AUGMENTOS_PORT;
    const protocol = secure ? 'https' : 'http';
    const serverUrl = `${protocol}://${host}:${port}`;
    console.log('\n\n\n\n Got a new server url: ', serverUrl, "\n\n\n");
    return serverUrl;
  }

  private constructor() {
    this.serverUrl = this.getServerUrl();
  }

  public static getInstance(): BackendServerComms {
    if (!BackendServerComms.instance) {
      BackendServerComms.instance = new BackendServerComms();
    }
    return BackendServerComms.instance;
  }

  // Existing method for generic REST requests.
  public async restRequest(endpoint: string, data: any, callback: Callback): Promise<void> {
    try {
      const url = this.serverUrl + endpoint;

      const config: AxiosRequestConfig = {
        method: data ? 'POST' : 'GET',
        url: url,
        headers: {
          'Content-Type': 'application/json',
        },
        ...(data && { data }),
      };

      const response = await axios(config);

      if (response.status === 200) {
        const responseData = response.data;
        if (responseData) {
          callback.onSuccess(responseData);
        } else {
          callback.onFailure(-1);
        }
      } else {
        console.log(`${this.TAG}: Error - ${response.statusText}`);
        callback.onFailure(response.status);
      }
    } catch (error: any) {
      console.log(`${this.TAG}: Network Error -`, error.message || error);
      callback.onFailure(-1);
    }
  }

  // Existing token exchange method.
  public async exchangeToken(supabaseToken: string): Promise<string> {
    const url = `${this.serverUrl}/auth/exchange-token`; // Adjust if needed
    const config: AxiosRequestConfig = {
      method: 'POST',
      url,
      headers: { 'Content-Type': 'application/json' },
      data: { supabaseToken },
    };

    try {
      const response = await axios(config);
      if (response.status === 200 && response.data) {
        console.log("GOT A RESPONSE!!!", JSON.stringify(response.data));
        return response.data.coreToken;
      } else {
        throw new Error(`Bad response: ${response.statusText}`);
      }
    } catch (err) {
      throw err;
    }
  }

  // New method: Call the /tpa-settings endpoint.
  public async getTpaSettings(coreToken: string): Promise<any> {
    const url = 'http://localhost:8002/tpasettings/tpasettings';
    console.log('url', url);
    const config: AxiosRequestConfig = {
      method: 'GET',
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coreToken}`,
      },
    };

    try {
      const response = await axios(config);
      if (response.status === 200 && response.data) {
        // Assume the response structure is { success: true, settings: { ... } }
        console.log(`${this.TAG}: Received tpa settings:`, response.data);
        return response.data.settings;
      } else {
        throw new Error(`Bad response: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error(`${this.TAG}: Error fetching tpa settings:`, error.message || error);
      throw error;
    }
  }
}
