// pages/TPAList.tsx
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash, Key, Share } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import api, { AppResponse } from '../services/api.service';
import { useAuth } from '../hooks/useAuth';

// Import dialogs
import ApiKeyDialog from "../components/dialogs/ApiKeyDialog";
import SharingDialog from "../components/dialogs/SharingDialog";
import DeleteDialog from "../components/dialogs/DeleteDialog";

const TPAList: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // State for TPA data
  const [tpas, setTpas] = useState<AppResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for dialogs
  const [selectedTpa, setSelectedTpa] = useState<AppResponse | null>(null);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch TPAs from API
  useEffect(() => {
    const fetchTPAs = async () => {
      if (!isAuthenticated) return;

      setIsLoading(true);
      try {
        const tpaData = await api.apps.getAll();
        setTpas(tpaData);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch TPAs:', err);
        setError('Failed to load TPAs. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchTPAs();
    }
  }, [isAuthenticated, authLoading]);

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
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin mx-auto h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
                <p className="mt-2 text-gray-500">Loading TPAs...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">
                <p>{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Package Name</TableHead>
                    <TableHead>Created</TableHead>
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
                        <TableCell className="text-gray-500">
                          {new Date(tpa.createdAt).toLocaleDateString()}
                        </TableCell>
                        {/* <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tpa.isPublic
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}>
                            {tpa.isPublic ? 'Public' : 'Private'}
                          </span>
                        </TableCell> */}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/tpas/${tpa.packageName}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTpa(tpa);
                                setIsApiKeyDialogOpen(true);
                              }}
                            >
                              <Key className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTpa(tpa);
                                setIsShareDialogOpen(true);
                              }}
                            >
                              <Share className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600"
                              onClick={() => {
                                setSelectedTpa(tpa);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
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
            )}
          </div>

          {tpas.length === 0 && !isLoading && !error && !searchQuery && (
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
      {selectedTpa && (
        <>
          <ApiKeyDialog
            tpa={selectedTpa}
            open={isApiKeyDialogOpen}
            onOpenChange={setIsApiKeyDialogOpen}
            apiKey={"********-****-****-****-************"}
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
            onConfirmDelete={(packageName) => {
              // Update local state when TPA is deleted
              setTpas(tpas.filter(tpa => tpa.packageName !== packageName));
            }}
          />
        </>
      )}
    </DashboardLayout>
  );
};

export default TPAList;