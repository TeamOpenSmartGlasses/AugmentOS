import React from 'react';

interface HeaderProps {
  activeTab: 'available' | 'installed' | 'browse';
  onTabChange: (tab: 'available' | 'installed' | 'browse') => void;
  isAuthenticated: boolean;
}

export function Header({ activeTab, onTabChange, isAuthenticated }: HeaderProps) {
  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center pt-4">
          <h1 className="text-2xl font-bold text-gray-800">App Store</h1>
        </div>
          {!isAuthenticated && (
            <div className="text-sm text-gray-500">Public Browse Mode</div>
          )}
        
        <div className="flex border-b border-gray-200">
          {isAuthenticated ? (
            // Authenticated navigation
            <>
              <button
                className={`py-2 px-4 text-sm font-medium ${
                  activeTab === 'available'
                    ? 'text-blue-600 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => onTabChange('available')}
              >
                Available Apps
              </button>
              <button
                className={`py-2 px-4 text-sm font-medium ${
                  activeTab === 'installed'
                    ? 'text-blue-600 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => onTabChange('installed')}
              >
                My Apps
              </button>
            </>
          ) : (
            // Public navigation
            <button
              className={`py-2 px-4 text-sm font-medium text-blue-600 border-b-2 border-blue-500`}
            >
              Browse Apps
            </button>
          )}
        </div>
      </div>
    </header>
  );
}