// DashboardHome.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, ArrowRightIcon, KeyIcon, CodeIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface TpaItem {
  packageName: string;
  displayName: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

const DashboardHome: React.FC = () => {
  // Mock data - in a real implementation, this would come from an API
  const userTpas: TpaItem[] = [
    {
      packageName: 'org.example.weatherapp',
      displayName: 'Weather App',
      createdAt: '2025-02-15',
      status: 'active',
    },
    {
      packageName: 'org.example.notesapp',
      displayName: 'Notes App',
      createdAt: '2025-02-20',
      status: 'inactive',
    }
  ];
  
  const hasNoTpas = userTpas.length === 0;
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className='select-none'>
            <div className="flex items-end gap-0">
              <h1 className="font-cuprum font-bold text-4xl">.\</h1>
              <h1 className="font-light text-xl pb-0.5 pl-1">ugment</h1>
              <h1 className="font-medium text-xl pb-0.5">OS</h1>
            </div>
            <h2 className="text-xs text-gray-600 pb-1">Developer Portal</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">Documentation</Button>
            <Button variant="ghost" size="sm">Settings</Button>
            <Button variant="ghost" size="sm">Sign Out</Button>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
          <nav className="p-4 space-y-1">
            <a href="/dashboard" className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-900">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </a>
            <a href="/tpas" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              My TPAs
            </a>
            <a href="/docs" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Documentation
            </a>
          </nav>
        </aside>
        
        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <Button className="gap-2" size="sm">
                <PlusIcon className="h-4 w-4" />
                Create TPA
              </Button>
            </div>
            
            {hasNoTpas ? (
              // Empty state
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardContent className="pt-6">
                  <div className="text-center py-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No TPAs created yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating your first Third-Party Application.</p>
                    <div className="mt-6">
                      <Button className="gap-2">
                        <PlusIcon className="h-4 w-4" />
                        Create TPA
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Dashboard with TPAs
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Quick stats card */}
                <Card className="col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-xs font-medium text-gray-500 uppercase">Total TPAs</div>
                        <div className="mt-1 text-2xl font-semibold">{userTpas.length}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-xs font-medium text-gray-500 uppercase">Active</div>
                        <div className="mt-1 text-2xl font-semibold">{userTpas.filter(tpa => tpa.status === 'active').length}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Quick actions card */}
                <Card className="col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                      <PlusIcon className="h-4 w-4" />
                      Create New TPA
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                      <KeyIcon className="h-4 w-4" />
                      Manage API Keys
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                      <CodeIcon className="h-4 w-4" />
                      View Code Examples
                    </Button>
                  </CardContent>
                </Card>
                
                {/* Documentation card */}
                <Card className="col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Resources</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <a href="#" className="block text-sm text-blue-600 hover:underline">Getting Started Guide</a>
                    <a href="#" className="block text-sm text-blue-600 hover:underline">TPA SDK Documentation</a>
                    <a href="#" className="block text-sm text-blue-600 hover:underline">API Reference</a>
                    <a href="#" className="block text-sm text-blue-600 hover:underline">Example TPAs</a>
                  </CardContent>
                </Card>
                
                {/* TPAs list card */}
                <Card className="col-span-1 lg:col-span-3">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Your TPAs</CardTitle>
                      <CardDescription>Manage your Third-Party Applications</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <a href="/tpas">
                        View All
                        <ArrowRightIcon className="h-4 w-4" />
                      </a>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 rounded-tl-lg">TPA Name</th>
                            <th scope="col" className="px-4 py-3">Package Name</th>
                            <th scope="col" className="px-4 py-3">Created</th>
                            <th scope="col" className="px-4 py-3">Status</th>
                            <th scope="col" className="px-4 py-3 rounded-tr-lg">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userTpas.map((tpa) => (
                            <tr key={tpa.packageName} className="bg-white border-b">
                              <td className="px-4 py-3 font-medium text-gray-900">{tpa.displayName}</td>
                              <td className="px-4 py-3 font-mono text-xs text-gray-500">{tpa.packageName}</td>
                              <td className="px-4 py-3 text-gray-500">{tpa.createdAt}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  tpa.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {tpa.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 flex gap-2">
                                <Button variant="outline" size="sm">Edit</Button>
                                <Button variant="outline" size="sm">API Key</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardHome;