import React, { useState } from 'react';
import { Search, Download, X, Lock } from 'lucide-react';

const AppStoreDesign = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isInstalling, setIsInstalling] = useState<string | null>(null);
  
  // Mock authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Mock apps data based on the AppI interface
  const apps = [
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
      logoURL: "https://dev.augmentos.org/mentra-merge.png",
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
  ];

  // Filter apps based on search query
  const filteredApps = searchQuery.trim() === ''
    ? apps
    : apps.filter(app =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Simulate install/uninstall
  const handleInstallClick = (packageName: string) => {
    if (!isLoggedIn) return;
    
    setIsInstalling(packageName);
    // Simulate API call delay
    setTimeout(() => {
      setIsInstalling(null);
    }, 1500);
  };

  // Toggle login status (for demo purposes)
  const toggleLogin = () => {
    setIsLoggedIn(!isLoggedIn);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-end select-none">
              <h1 className="font-cuprum font-bold text-3xl">.\</h1>
              <h1 className="font-light text-xl pb-0.5 pl-1">ugment</h1>
              <h1 className="font-bold text-xl pb-0.5">OS</h1>
              <span className="ml-2 font-medium text-lg">App Store</span>
            </div>

            <div className="flex items-center">
              <button 
                className={`${isLoggedIn ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-md`}
                onClick={toggleLogin}
              >
                {isLoggedIn ? 'Sign Out' : 'Sign In'}
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mt-4">
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

          {/* Navigation tabs - only show if logged in */}
          {isLoggedIn && (
            <nav className="flex space-x-6 mt-4">
              <a href="#" className="text-blue-600 font-medium pb-2 border-b-2 border-blue-600">
                All Apps
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-800 font-medium pb-2">
                My Apps
              </a>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Search result indicator */}
        {searchQuery && (
          <div className="mb-4">
            <p className="text-gray-600">
              {filteredApps.length} {filteredApps.length === 1 ? 'result' : 'results'} for "{searchQuery}"
            </p>
          </div>
        )}

        {/* App grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredApps.map(app => (
            <div key={app.packageName} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start">
                  <img
                    src={app.logoURL}
                    alt={`${app.name} logo`}
                    className="w-12 h-12 rounded-md object-cover"
                    onError={(e) => {
                      // Fallback for broken images
                      (e.target as HTMLImageElement).src = "/api/placeholder/48/48";
                    }}
                  />
                  <div className="ml-3 flex-1">
                    <h3 className="font-medium text-gray-900">{app.name}</h3>
                    <p className="text-xs text-gray-500">{app.developerName}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600 line-clamp-3">{app.description}</p>
                <div className="mt-4">
                  {isLoggedIn ? (
                    app.isInstalled ? (
                      <button
                        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        onClick={() => handleInstallClick(app.packageName)}
                      >
                        {isInstalling === app.packageName ? (
                          <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full mr-2"></div>
                        ) : null}
                        Open
                      </button>
                    ) : (
                      <button
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleInstallClick(app.packageName)}
                      >
                        {isInstalling === app.packageName ? (
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        ) : (
                          <Download className="h-4 w-4 mr-1" />
                        )}
                        Install
                      </button>
                    )
                  ) : (
                    <button
                      className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-100 cursor-not-allowed"
                      disabled
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

        {/* Empty state */}
        {filteredApps.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No apps found for "{searchQuery}"</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AppStoreDesign;