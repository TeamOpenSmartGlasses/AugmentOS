import axios, { AxiosRequestConfig } from 'axios';
import { Config } from './Config.ts';

interface Callback {
    onSuccess: (data: any) => void;
    onFailure: (errorCode: number) => void;
}

export default class BackendServerComms {
    private static instance: BackendServerComms;
    private TAG = 'MXT2_BackendServerComms';
    private serverUrl = Config.serverUrl;

    private constructor() {}

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
}
