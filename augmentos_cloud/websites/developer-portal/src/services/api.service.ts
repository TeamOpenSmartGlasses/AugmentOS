// src/services/api.service.ts
import axios from "axios";
import { TPA } from "@/types/tpa";

// Set default config
axios.defaults.baseURL = import.meta.env.VITE_API_URL || "http://localhost:8002";
axios.defaults.withCredentials = true;
console.log("API URL", axios.defaults.baseURL);

// Extended TPA interface for API responses
export interface TPAResponse extends TPA {
  createdAt: string;
  updatedAt: string;
}

// API key response
export interface ApiKeyResponse {
  apiKey: string;
  createdAt: string;
}

// Developer user interface
export interface DeveloperUser {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

const api = {
  // Authentication endpoints
  auth: {
    me: async (): Promise<DeveloperUser> => {
      const response = await axios.get("/api/auth/me");
      return response.data;
    },

    login: async (email: string, password: string): Promise<{ token: string; user: DeveloperUser }> => {
      const response = await axios.post("/api/auth/login", { email, password });
      return response.data;
    },

    register: async (email: string, password: string, name?: string): Promise<{ token: string; user: DeveloperUser }> => {
      const response = await axios.post("/api/auth/register", { email, password, name });
      return response.data;
    },

    logout: async (): Promise<void> => {
      await axios.post("/api/auth/logout");
    },
  },

  // TPA management endpoints
  tpas: {
    // Get all TPAs for the current developer
    getAll: async (): Promise<TPAResponse[]> => {
      const response = await axios.get("/api/apps/developer");
      return response.data;
    },

    // Get a specific TPA by package name
    getByPackageName: async (packageName: string): Promise<TPAResponse> => {
      const response = await axios.get(`/api/apps/${packageName}`);
      return response.data;
    },

    // Create a new TPA
    create: async (tpaData: Omit<TPA, "id">): Promise<{ tpa: TPAResponse; apiKey: string }> => {
      const response = await axios.post("/api/apps/register", tpaData);
      return response.data;
    },

    // Update an existing TPA
    update: async (packageName: string, tpaData: Partial<TPA>): Promise<TPAResponse> => {
      const response = await axios.put(`/api/apps/${packageName}`, tpaData);
      return response.data;
    },

    // Delete a TPA
    delete: async (packageName: string): Promise<void> => {
      await axios.delete(`/api/apps/${packageName}`);
    },

    // API key management
    apiKey: {
      // Generate a new API key for a TPA
      regenerate: async (packageName: string): Promise<ApiKeyResponse> => {
        const response = await axios.post(`/api/apps/${packageName}/api-key`);
        return response.data;
      },
    },
  },

  // App Store endpoints for the System App Store TPA
  appStore: {
    // Get all available TPAs in the app store
    getAvailableApps: async (): Promise<TPAResponse[]> => {
      const response = await axios.get("/api/apps/store");
      return response.data;
    },

    // Get user's installed TPAs
    getUserApps: async (): Promise<{ installed: TPAResponse[]; running: string[] }> => {
      const response = await axios.get("/api/user/apps");
      return response.data;
    },

    // Install a TPA for the current user
    installApp: async (packageName: string, appStoreId: string = "system"): Promise<void> => {
      await axios.post("/api/user/apps/install", { packageName, appStoreId });
    },

    // Uninstall a TPA for the current user
    uninstallApp: async (packageName: string, appStoreId: string = "system"): Promise<void> => {
      await axios.post("/api/user/apps/uninstall", { packageName, appStoreId });
    },

    // Get app settings for a specific TPA
    getAppSettings: async (packageName: string): Promise<any[]> => {
      const response = await axios.get(`/api/user/apps/${packageName}/settings`);
      return response.data;
    },

    // Update app settings for a specific TPA
    updateAppSettings: async (packageName: string, settings: any[]): Promise<void> => {
      await axios.put(`/api/user/apps/${packageName}/settings`, settings);
    },
  },

  // Installation sharing endpoints
  sharing: {
    // Get a shareable installation link for a TPA
    getInstallLink: async (packageName: string): Promise<string> => {
      const response = await axios.get(`/api/apps/${packageName}/share`);
      return response.data.installUrl;
    },

    // Track that a TPA has been shared with a specific email
    trackSharing: async (packageName: string, emails: string[]): Promise<void> => {
      await axios.post(`/api/apps/${packageName}/share`, { emails });
    },
  },
};

export default api;