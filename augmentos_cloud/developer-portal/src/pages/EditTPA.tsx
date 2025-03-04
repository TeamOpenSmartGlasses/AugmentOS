// pages/EditTPA.tsx
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import api from '@/services/api.service';
import { TPA } from '@/types/tpa';
import { toast } from 'sonner';

const EditTPA: React.FC = () => {
  const navigate = useNavigate();
  const { packageName } = useParams<{ packageName: string }>();
  
  // Form state
  const [formData, setFormData] = useState<TPA>({
    id: '',
    packageName: '',
    name: '',
    description: '',
    webhookURL: '',
    logoURL: '',
    isPublic: false,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  
  // Fetch TPA data from API
  useEffect(() => {
    const fetchTPA = async () => {
      if (!packageName) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const tpaData = await api.apps.getByPackageName(packageName);
        
        // Convert API response to TPA type
        const tpa: TPA = {
          id: tpaData.packageName, // Using packageName as id since API doesn't return id
          packageName: tpaData.packageName,
          name: tpaData.name,
          description: tpaData.description || '',
          webhookURL: tpaData.webhookURL,
          logoURL: tpaData.logoURL,
          webviewURL: tpaData.webviewURL,
          isPublic: tpaData.isPublic || false,
        };
        
        setFormData(tpa);
      } catch (err) {
        console.error('Error fetching TPA:', err);
        setError('Failed to load TPA data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTPA();
  }, [packageName]);
  
  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setIsSaved(false);
    
    try {
      if (!packageName) throw new Error('Package name is missing');
      
      // Update TPA via API
      await api.apps.update(packageName, {
        name: formData.name,
        description: formData.description,
        webhookURL: formData.webhookURL,
        logoURL: formData.logoURL,
        webviewURL: formData.webviewURL
      });
      
      // Show success message
      setIsSaved(true);
      toast.success('TPA updated successfully');
      
      // Reset saved status after 3 seconds
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating TPA:', err);
      setError('Failed to update TPA. Please try again.');
      toast.error('Failed to update TPA');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-6">
          <Link to="/tpas" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to TPAs
          </Link>
        </div>
        
        <Card className="shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin mx-auto h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
              <p className="mt-2 text-gray-500">Loading TPA data...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle className="text-2xl">Edit TPA</CardTitle>
                <CardDescription>
                  Update your Third-Party Application for AugmentOS.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pb-5">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {isSaved && (
                  <Alert className="bg-green-50 text-green-800 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">TPA updated successfully!</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="packageName">Package Name</Label>
                  <Input 
                    id="packageName" 
                    name="packageName"
                    value={formData.packageName}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    Package names cannot be changed after creation.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input 
                    id="name" 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., My Awesome App" 
                  />
                  <p className="text-xs text-gray-500">
                    The name that will be displayed to users in the AugmentOS app store.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe what your TPA does..." 
                    rows={3}
                  />
                  <p className="text-xs text-gray-500">
                    Provide a clear, concise description of your application's functionality.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="webhookURL">Webhook URL</Label>
                  <Input 
                    id="webhookURL" 
                    name="webhookURL"
                    value={formData.webhookURL}
                    onChange={handleChange}
                    placeholder="https://yourserver.com/webhook" 
                  />
                  <p className="text-xs text-gray-500">
                    The endpoint where AugmentOS will send events when your TPA is activated.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="logoURL">Logo URL</Label>
                  <Input 
                    id="logoURL" 
                    name="logoURL"
                    value={formData.logoURL}
                    onChange={handleChange}
                    placeholder="https://yourserver.com/logo.png" 
                  />
                  <p className="text-xs text-gray-500">
                    URL to an image that will be used as your TPA's icon (recommended: 512x512 PNG).
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="webviewURL">Webview URL (Optional)</Label>
                  <Input 
                    id="webviewURL" 
                    name="webviewURL"
                    value={formData.webviewURL || ''}
                    onChange={handleChange}
                    placeholder="https://yourserver.com/webview" 
                  />
                  <p className="text-xs text-gray-500">
                    If your TPA has a companion mobile interface, provide the URL here.
                  </p>
                </div>

                {/* Toggle switch for isPublic */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="isPublic" className="flex items-center">
                    <span className="mr-2">Public TPA</span>
                    <input 
                      id="isPublic" 
                      name="isPublic"
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={e => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                    />
                  </Label>
                  <p className="text-xs text-gray-500">
                    Public TPAs are visible to all AugmentOS users in the app store.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t p-6">
                <Button variant="outline" type="button" onClick={() => navigate('/tpas')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : "Save Changes"}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EditTPA;