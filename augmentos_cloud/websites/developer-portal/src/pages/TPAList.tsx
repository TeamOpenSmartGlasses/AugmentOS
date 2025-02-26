// pages/TPAList.tsx
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from 'react-router-dom';
import { Copy, MoreVertical, Plus, Edit, Trash, Key, Share, ExternalLink } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";

// Import dialogs
import ApiKeyDialog from "../components/dialogs/ApiKeyDialog";
import SharingDialog from "../components/dialogs/SharingDialog";
import DeleteDialog from "../components/dialogs/DeleteDialog";
import { TPA } from '@/types/tpa';

// Type for a Third-Party Application
// interface TPA {
//   packageName: string;
//   displayName: string;
//   description: string;
//   createdAt: string;
//   status: 'active' | 'inactive';
//   webhookURL: string;
//   logoURL: string;
//   webviewURL?: string;
// }

const TPAList: React.FC = () => {
  const navigate = useNavigate();
  
  // Mock data
  const [tpas, setTpas] = useState<TPA[]>([
    {
      id: '1',
      packageName: 'org.example.weatherapp',
      name: 'Weather App',
      description: 'Real-time weather updates right in your field of view',
      // createdAt: '2025-02-15',
      // status: 'active',
      webhookURL: 'https://example.com/weather/webhook',
      logoURL: 'https://example.com/weather-logo.png'
    },
    {
      id: '2',
      packageName: 'org.example.notesapp',
      name: 'Notes App',
      description: 'Voice-controlled note taking for hands-free productivity',
      // createdAt: '2025-02-20',
      // status: 'inactive',
      webhookURL: 'https://example.com/notes/webhook',
      logoURL: 'https://example.com/notes-logo.png',
      webviewURL: 'https://example.com/notes/webview'
    }
  ]);

  // States for dialogs
  const [selectedTpa, setSelectedTpa] = useState<TPA | null>(null);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Handle TPA deletion
  const handleDeleteTpa = (packageName: string) => {
    setTpas(tpas.filter(tpa => tpa.packageName !== packageName));
  };
  
  // Filter TPAs based on search query
  const filteredTpas = searchQuery 
    ? tpas.filter(tpa => 
        tpa.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpa.packageName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tpas;
  
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">My TPAs</h1>
          <Button 
            className="gap-2" 
            onClick={() => navigate('/tpas/create')}
          >
            <Plus className="h-4 w-4" />
            Create TPA
          </Button>
        </div>
        
        <Card className="mb-6">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">All Third-Party Applications</h2>
              <div className="w-64">
                <Input
                  placeholder="Search TPAs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Package Name</TableHead>
                  {/* <TableHead>Created</TableHead> */}
                  {/* <TableHead>Status</TableHead> */}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTpas.length > 0 ? (
                  filteredTpas.map((tpa) => (
                    <TableRow key={tpa.packageName}>
                      <TableCell className="font-medium">{tpa.name}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{tpa.packageName}</TableCell>
                      {/* <TableCell>{tpa.createdAt}</TableCell> */}
                      {/* <TableCell>
                        <Badge 
                          variant={tpa.status === 'active' ? 'default' : 'secondary'}
                          className={tpa.status === 'active' 
                            ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-100'}
                        >
                          {tpa.status}
                        </Badge>
                      </TableCell> */}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/tpas/${tpa.packageName}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTpa(tpa);
                                  setIsApiKeyDialogOpen(true);
                                }}
                              >
                                <Key className="h-4 w-4 mr-2" />
                                Manage API Key
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTpa(tpa);
                                  setIsShareDialogOpen(true);
                                }}
                              >
                                <Share className="h-4 w-4 mr-2" />
                                Share with Testers
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => {
                                  setSelectedTpa(tpa);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                      {searchQuery ? 'No TPAs match your search criteria' : 'No TPAs created yet'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {tpas.length === 0 && !searchQuery && (
            <div className="p-6 text-center">
              <p className="text-gray-500 mb-4">Get started by creating your first Third-Party Application</p>
              <Button 
                onClick={() => navigate('/tpas/create')}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create TPA
              </Button>
            </div>
          )}
        </Card>
      </div>
      
      {/* Dialogs */}
      <ApiKeyDialog 
        tpa={selectedTpa} 
        open={isApiKeyDialogOpen} 
        onOpenChange={setIsApiKeyDialogOpen} 
      />
      
      <SharingDialog 
        tpa={selectedTpa} 
        open={isShareDialogOpen} 
        onOpenChange={setIsShareDialogOpen} 
      />
      
      <DeleteDialog 
        tpa={selectedTpa} 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen}
        onConfirmDelete={handleDeleteTpa}
      />
    </DashboardLayout>
  );
};

export default TPAList;