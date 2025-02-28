import React, { useState, useEffect } from 'react';
import { AppList } from './components/AppList';
import { Header } from './components/Header';
import { useToken } from './hooks/useToken';
import { fetchAvailableApps, fetchInstalledApps, fetchPublicApps } from './api';
import { App } from './types';

function Webview() {
  const token = useToken();
  const [availableApps, setAvailableApps] = useState<App[]>([]);
  const [installedApps, setInstalledApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'installed' | 'browse'>('available');

  // Track if the user is authenticated
  const isAuthenticated = !!token;

  useEffect(() => {
    // If not authenticated, default to browse tab
    if (!isAuthenticated && activeTab !== 'browse') {
      setActiveTab('browse');
    }
    
    // If authenticated, don't allow browse tab
    if (isAuthenticated && activeTab === 'browse') {
      setActiveTab('available');
    }
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    async function loadData() {
      try {
        // For the browse tab and available tab, fetch available apps
        if (activeTab === 'browse' || activeTab === 'available') {
          const availableData = isAuthenticated 
            ? await fetchAvailableApps(token!)
            : await fetchPublicApps(); // Create this function for public browsing
            
          setAvailableApps(availableData.apps);
        }
        
        // Only fetch installed apps if authenticated and on installed tab
        if (isAuthenticated && activeTab === 'installed') {
          const installedData = await fetchInstalledApps(token!);
          setInstalledApps(installedData.apps);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading apps:', err);
        setError('Failed to load apps. Please try again.');
        setLoading(false);
      }
    }

    setLoading(true);
    loadData();
  }, [token, activeTab, isAuthenticated]);

  const handleInstall = async (packageName: string) => {
    if (!isAuthenticated) {
      setError('You need to be authenticated to install apps');
      return;
    }
    
    // Implement app installation logic
    console.log(`Installing ${packageName}`);
  };

  const handleUninstall = async (packageName: string) => {
    if (!isAuthenticated) {
      setError('You need to be authenticated to uninstall apps');
      return;
    }
    
    // Implement app uninstallation logic
    console.log(`Uninstalling ${packageName}`);
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        isAuthenticated={isAuthenticated}
      />
      
      <main className="container mx-auto py-6 px-4">
        {!isAuthenticated && activeTab !== 'browse' && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <p className="font-medium">You are browsing in public mode</p>
            <p className="text-sm">Launch the App Store from AugmentOS to install apps.</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
            <button 
              className="text-sm text-red-700 underline mt-2"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        ) : (
          <AppList 
            apps={activeTab === 'installed' ? installedApps : availableApps}
            type={activeTab}
            onInstall={handleInstall}
            onUninstall={handleUninstall}
            isAuthenticated={isAuthenticated}
          />
        )}
      </main>
    </div>
  );
}

export default Webview;