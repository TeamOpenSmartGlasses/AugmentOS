import axios, { AxiosRequestConfig } from 'axios';
import { Config } from 'react-native-config';
//import Config from 'react-native-config';
interface Callback {
    onSuccess: (data: any) => void;
    onFailure: (errorCode: number) => void;
}

export default class BackendServerComms {
    private static instance: BackendServerComms;
    private TAG = 'MXT2_BackendServerComms';
    private serverUrl;

    private getServerUrl(): string {
        const secure = Config.AUGMENTOS_SECURE === 'true';
        const host = Config.AUGMENTOS_HOST;
        const port = Config.AUGMENTOS_PORT;
        const protocol = secure ? 'https' : 'http';
        const serverUrl = `${protocol}://${host}:${port}`;
        console.log("\n\n\n\n Got a new server url: ");
        console.log(serverUrl);
        console.log('React Native Config:', Config);
        console.log("\n\n\n");
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

    public async restRequest(endpoint: string, data: any, callback: Callback): Promise<void> {
        try {
            const url = this.serverUrl + endpoint;

            // Axios request configuration
            const config: AxiosRequestConfig = {
                method: data ? 'POST' : 'GET',
                url: url,
                headers: {
                    'Content-Type': 'application/json',
                },
                ...(data && { data }),
            };

            // Make the request
            const response = await axios(config);

            if (response.status === 200) {
                const responseData = response.data;
                // console.log(`${this.TAG}: Response Data -`, responseData);

                if (responseData) {
                    // console.log(`${this.TAG}: Received app store data`);
                    callback.onSuccess(responseData);
                } else {
                    // console.log(`${this.TAG}: Unexpected endpoint or unsuccessful response`);
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

    public async exchangeToken(supabaseToken: string): Promise<string> {
      const url = `${this.serverUrl}/auth/exchange-token`; // Adjust if needed

      // Build request with axios
      const config: AxiosRequestConfig = {
        method: 'POST',
        url,
        headers: { 'Content-Type': 'application/json' },
        data: { supabaseToken }, // body
      };

      try {
        const response = await axios(config);
        if (response.status === 200 && response.data) {
          // Assuming the backend returns { myCustomToken: "xxx" }
          console.log("GOT A RESPONSE!!!")
          console.log("\n\n");
          console.log(JSON.stringify(response.data));
          console.log("\n\n\n\n");
          return response.data.coreToken;
        } else {
          throw new Error(`Bad response: ${response.statusText}`);
        }
      } catch (err) {
        throw err;
      }
    }

    // New method: Call the /tpa-settings endpoint.
    public async getTpaSettings(coreToken: string, tpaName: string): Promise<any> {
      // Example endpoint: GET /tpasettings/<tpaName>
      const url = `http://localhost:8002/tpasettings/${tpaName}`;
      console.log('Fetching TPA settings from:', url);

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
          // Assume response.data is the shape you need:
          // { success: true, settings: { instructions, settings: [...] } } or something similar
          console.log('Received TPA settings:', response.data);
          return response.data; // or return response.data.settings if that’s the actual payload
        } else {
          throw new Error(`Bad response: ${response.statusText}`);
        }
      } catch (error: any) {
        console.error('Error fetching TPA settings:', error.message || error);
        throw error;
      }
    }
}
