import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, X, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../api';
import { AppI } from '../types';
import Header from '../components/Header';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const AppStore: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apps, setApps] = useState<AppI[]>([]);
  const [installingApp, setInstallingApp] = useState<string | null>(null);

  // Fetch apps on component mount
  useEffect(() => {
    fetchApps();
  }, []);

  // Fetch available apps
  const fetchApps = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let appList: AppI[] = [];

      // TODO(isaiah): Update to use system apps if authenticated
      if (isAuthenticated) {
        // If authenticated, get available apps which might include installed status
        try {
          appList = await api.app.getAvailableApps();
        } catch (err) {
          console.error('Error fetching available apps:', err);
          // Fall back to public apps
          appList = await api.app.getAvailableApps();
        }
      } else {
        // If not authenticated, get public apps
        appList = await api.app.getAvailableApps();
      }

      setApps(appList);
    } catch (err) {
      console.error('Error fetching apps:', err);
      setError('Failed to load apps. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter apps based on search query (client-side filtering now, adjust if needed for server-side)
  const filteredApps = searchQuery.trim() === ''
    ? apps
    : apps.filter(app =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.description && app.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  // Handle search submit
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      fetchApps(); // If search query is empty, reset to all apps
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const results = await api.app.searchApps(searchQuery);

      setApps(results);
    } catch (err) {
      console.error('Error searching apps:', err);
      toast.error('Failed to search apps');
      setError('Failed to search apps. Please try again.'); // Set error state for UI
    } finally {
      setIsLoading(false);
    }
  };

  // Handle app installation
  const handleInstall = async (packageName: string) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setInstallingApp(packageName);

      const success = await api.app.installApp(packageName, user?.email || '');

      if (success) {
        toast.success('App installed successfully');

        // Update the app in the list to show as installed
        setApps(prevApps =>
          prevApps.map(app =>
            app.packageName === packageName
              ? { ...app, isInstalled: true, installedDate: new Date().toISOString() }
              : app
          )
        );
      } else {
        toast.error('Failed to install app');
      }
    } catch (err) {
      console.error('Error installing app:', err);
      toast.error('Failed to install app');
    } finally {
      setInstallingApp(null);
    }
  };

  // Handle app uninstallation
  const handleUninstall = async (packageName: string) => {
    if (!isAuthenticated) return;

    try {
      setInstallingApp(packageName);

      const success = await api.app.uninstallApp(packageName, user?.email || '');

      if (success) {
        toast.success('App uninstalled successfully');

        // Update the app in the list to show as not installed
        setApps(prevApps =>
          prevApps.map(app =>
            app.packageName === packageName
              ? { ...app, isInstalled: false, installedDate: undefined }
              : app
          )
        );
      } else {
        toast.error('Failed to uninstall app');
      }
    } catch (err) {
      console.error('Error uninstalling app:', err);
      toast.error('Failed to uninstall app');
    } finally {
      setInstallingApp(null);
    }
  };

  // Navigate to app details
  // const handleAppClick = (packageName: string) => {
  //   navigate(`/app/${packageName}`);
  // };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative mt-4 max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="bg-gray-100 w-full pl-10 pr-4 py-2 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={() => {
                setSearchQuery('');
                fetchApps(); // Reset to all apps
              }}
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </form>

        {/* Search result indicator */}
        {searchQuery && (
          <div className="my-4 max-w-2xl mx-auto">
            <p className="text-gray-600">
              {filteredApps.length} {filteredApps.length === 1 ? 'result' : 'results'} for "{searchQuery}"
            </p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Error message */}
        {error && !isLoading && (
          <div className="my-4 max-w-2xl mx-auto p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p>{error}</p>
            <button
              className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
              onClick={fetchApps}
            >
              Try Again
            </button>
          </div>
        )}

        {/* App grid */}
        {!isLoading && !error && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredApps.map(app => (
              <div
                key={app.packageName}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden "
              >
                <div className="p-4">
                  <div
                    className="flex items-start cursor-pointer"
                    // onClick={() => handleAppClick(app.packageName)}
                  >
                    <img
                      src={app.logoURL}
                      alt={`${app.name} logo`}
                      className="w-12 h-12 rounded-md object-cover"
                      onError={(e) => {
                        // Fallback for broken images
                        (e.target as HTMLImageElement).src = "https://placehold.co/48x48/gray/white?text=App";
                      }}
                    />
                    <div className="ml-3 flex-1">
                      <h3 className="font-medium text-gray-900">{app.name}</h3>
                      <p className="text-xs text-gray-500">{app.developerName || 'Mentra Labs'}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600 line-clamp-3">{app.description || 'No description available.'}</p>
                  <div className="mt-4">
                    {isAuthenticated ? (
                      app.isInstalled ? (
                        <Button
                          // className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          className="w-full"
                          onClick={() => handleUninstall(app.packageName)}
                          disabled={installingApp === app.packageName}
                        >
                          {installingApp === app.packageName ? (
                            <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full mr-2"></div>
                          ) : null}
                          Uninstall
                        </Button>
                      ) : (
                        <Button
                          // className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                          className="w-full"
                          variant={"outline"}
                          onClick={() => handleInstall(app.packageName)}
                          disabled={installingApp === app.packageName}
                        >
                          {installingApp === app.packageName ? (
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          ) : (
                            <Download className="h-4 w-4 mr-1" />
                          )}
                          Install
                        </Button>
                      )
                    ) : (
                      <button
                        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-100 cursor-not-allowed"
                        onClick={() => navigate('/login')}
                      >
                        <Lock className="h-4 w-4 mr-1" />
                        Sign in to install
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredApps.length === 0 && (
          <div className="text-center py-12">
            {searchQuery ? (
              <>
                <p className="text-gray-500 text-lg">No apps found for "{searchQuery}"</p>
                <button
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={() => {
                    setSearchQuery('');
                    fetchApps(); // Reset to all apps
                  }}
                >
                  Clear Search
                </button>
              </>
            ) : (
              <p className="text-gray-500 text-lg">No apps available at this time.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AppStore;
