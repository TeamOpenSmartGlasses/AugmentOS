import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, X, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import Header from '../components/Header';
import { toast } from 'sonner';

// Define app interface
interface App {
  packageName: string;
  name: string;
  description?: string;
  logoURL: string;
  developerName?: string;
  isInstalled?: boolean;
}

const AppStore: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [installingApp, setInstallingApp] = useState<string | null>(null);

  // Fetch apps on component mount
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Use public endpoint to fetch apps
        const response = await axios.get('http://localhost:8042/api/apps/public');
        
        if (response.data && response.data.apps) {
          setApps(response.data.apps);
        } else {
          // Use mock data as fallback if API fails
          setApps([
            {
              packageName: "augmentos.dev.flash",
              name: "Flash ⚡️",
              description: "Real-time weather updates right in your field of view",
              logoURL: "https://dev.augmentos.org/flash.png",
              developerName: "Mentra Labs",
              isInstalled: false
            },
            {
              packageName: "mentra.glass.mira",
              name: "Mira AI ✨",
              description: "Real-time weather updates right in your field of view",
              logoURL: "https://dev.augmentos.org/mira.png",
              developerName: "Mentra Labs",
              isInstalled: false
            },
            {
              packageName: "mentra.glass.merge",
              name: "Mentra Merge",
              description: "Augment your everyday conversations with helpful in the moment AI insights",
              logoURL: "https://dev.augmentos.org/merge.png",
              developerName: "Mentra Labs",
              isInstalled: false
            },
            {
              packageName: "mentra.glass.voice-notes",
              name: "Voice Notes",
              description: "Voice-controlled note taking for hands-free productivity",
              logoURL: "https://dev.augmentos.org/voice-notes2.png",
              developerName: "Mentra Labs",
              isInstalled: false
            },
            {
              packageName: "mentra.glass.live-captions",
              name: "Translator",
              developerName: "Mentra Labs",
              description: "Real-time translation of text in your field of view",
              logoURL: "https://dev.augmentos.org/live-captions.png",
              isInstalled: false
            }
          ]);
        }
      } catch (err) {
        console.error('Error fetching apps:', err);
        // Use mock data as fallback
        setApps([
          {
            packageName: "ballah.tech.flash",
            name: "Flash ⚡️",
            description: "Real-time weather updates right in your field of view",
            logoURL: "https://dev.augmentos.org/flash.png",
            developerName: "Mentra Labs",
            isInstalled: false
          },
          {
            packageName: "mentra.glass.mira",
            name: "Mira AI ✨",
            description: "Real-time weather updates right in your field of view",
            logoURL: "https://dev.augmentos.org/mira.png",
            developerName: "Mentra Labs",
            isInstalled: false
          },
          {
            packageName: "mentra.glass.merge",
            name: "Mentra Merge",
            description: "Augment your everyday conversations with helpful in the moment AI insights",
            logoURL: "https://dev.augmentos.org/merge.png",
            developerName: "Mentra Labs",
            isInstalled: false
          },
          {
            packageName: "mentra.glass.voice-notes",
            name: "Voice Notes",
            description: "Voice-controlled note taking for hands-free productivity",
            logoURL: "https://dev.augmentos.org/voice-notes2.png",
            developerName: "Mentra Labs",
            isInstalled: true
          },
          {
            packageName: "mentra.glass.live-captions",
            name: "Translator",
            developerName: "Mentra Labs",
            description: "Real-time translation of text in your field of view",
            logoURL: "https://dev.augmentos.org/live-captions.png",
            isInstalled: false
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApps();
  }, []);

  // Filter apps based on search query
  const filteredApps = searchQuery.trim() === ''
    ? apps
    : apps.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.description && app.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  // Handle app installation
  const handleInstall = async (packageName: string) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setInstallingApp(packageName);
      
      // Call installation API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay
      
      // Update UI to show app as installed
      setApps(prevApps => 
        prevApps.map(app => 
          app.packageName === packageName
            ? { ...app, isInstalled: true }
            : app
        )
      );
      
      toast.success('App installed successfully');
    } catch (err) {
      console.error('Error installing app:', err);
      toast.error('Failed to install app');
    } finally {
      setInstallingApp(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Search bar */}
        <div className="relative mt-4 max-w-2xl mx-auto">
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
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

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

        {/* App grid */}
        {!isLoading && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredApps.map(app => (
              <div 
                key={app.packageName} 
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-start">
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
                      <p className="text-xs text-gray-500">{app.developerName || 'Unknown Developer'}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600 line-clamp-3">{app.description || 'No description available.'}</p>
                  <div className="mt-4">
                    {app.isInstalled ? (
                      <button
                        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        disabled={installingApp === app.packageName}
                      >
                        {installingApp === app.packageName ? (
                          <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full mr-2"></div>
                        ) : null}
                        Open
                      </button>
                    ) : (
                      <button
                        className={`w-full flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md ${
                          isAuthenticated 
                            ? "border-transparent text-white bg-blue-600 hover:bg-blue-700" 
                            : "border-gray-300 text-gray-500 bg-gray-100"
                        }`}
                        onClick={() => isAuthenticated ? handleInstall(app.packageName) : navigate('/login')}
                        disabled={installingApp === app.packageName}
                      >
                        {installingApp === app.packageName ? (
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        ) : isAuthenticated ? (
                          <Download className="h-4 w-4 mr-1" />
                        ) : (
                          <Lock className="h-4 w-4 mr-1" />
                        )}
                        {isAuthenticated ? 'Install' : 'Sign in to install'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredApps.length === 0 && (
          <div className="text-center py-12">
            {searchQuery ? (
              <>
                <p className="text-gray-500 text-lg">No apps found for "{searchQuery}"</p>
                <button
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={() => setSearchQuery('')}
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