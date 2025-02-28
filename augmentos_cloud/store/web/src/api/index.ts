import { App } from '../types';

// const API_BASE_URL = "store.augmentos.org";
const API_BASE_URL = "http://localhost:8042/api";

/**
 * Fetch available apps from the API
 * 
 * @param token - Authentication token
 * @returns Promise with available apps data
 */
export async function fetchAvailableApps(token: string): Promise<{ apps: App[] }> {
  const response = await fetch(`${API_BASE_URL}/apps/available`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch available apps');
  }

  return response.json();
}

// In api/index.ts

/**
 * Fetch available apps for public browsing (no auth required)
 * 
 * @returns Promise with available apps data
 */
export async function fetchPublicApps(): Promise<{ apps: App[] }> {
  const response = await fetch(`${API_BASE_URL}/apps/public`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch available apps');
  }

  return response.json();
}

/**
 * Fetch installed apps from the API
 * 
 * @param token - Authentication token
 * @returns Promise with installed apps data
 */
export async function fetchInstalledApps(token: string): Promise<{ apps: App[] }> {
  const response = await fetch(`${API_BASE_URL}/apps/installed`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch installed apps');
  }

  return response.json();
}

/**
 * Install an app
 * 
 * @param token - Authentication token
 * @param packageName - Package name of the app to install
 * @returns Promise with installation result
 */
export async function installApp(token: string, packageName: string): Promise<{ success: boolean, message: string }> {
  const response = await fetch(`${API_BASE_URL}/apps/install`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ packageName })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to install app');
  }

  return response.json();
}

/**
 * Uninstall an app
 * 
 * @param token - Authentication token
 * @param packageName - Package name of the app to uninstall
 * @returns Promise with uninstallation result
 */
export async function uninstallApp(token: string, packageName: string): Promise<{ success: boolean, message: string }> {
  const response = await fetch(`${API_BASE_URL}/apps/uninstall`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ packageName })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to uninstall app');
  }

  return response.json();
}