// pages/EditTPA.tsx
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircle2, AlertCircle } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { TPA } from '@/types/tpa';

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
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  
  // Mock data fetch - In a real app, this would be an API call
  useEffect(() => {
    // Simulating API fetch
    const fetchTPA = async () => {
      try {
        // Mock data for the specific TPA
        const mockTPA: TPA = {
          id: packageName === 'org.example.weatherapp' ? '1' : '2',
          packageName: packageName || '',
          name: packageName === 'org.example.weatherapp' ? 'Weather App' : 'Notes App',
          description: packageName === 'org.example.weatherapp' 
            ? 'Real-time weather updates right in your field of view'
            : 'Voice-controlled note taking for hands-free productivity',
          webhookURL: `https://example.com/${packageName?.split('.').pop()}/webhook`,
          logoURL: `https://example.com/${packageName?.split('.').pop()}-logo.png`,
          webviewURL: packageName === 'org.example.notesapp' ? 'https://example.com/notes/webview' : '',
        };
        
        setFormData(mockTPA);
      } catch (error) {
        console.error(error);
        setError('Failed to load TPA data');
      }
    };
    
    if (packageName) {
      fetchTPA();
    }
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
    setIsLoading(true);
    setError(null);
    setIsSaved(false);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would be an API call to update the TPA
      console.log('TPA updated:', formData);
      
      setIsSaved(true);
      
      // Reset saved status after 3 seconds
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (error) {
      console.error(error);
      setError('Failed to update TPA');
    } finally {
      setIsLoading(false);
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
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-2xl">Edit TPA</CardTitle>
              <CardDescription>
                Update your Third-Party Application for AugmentOS.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                <p className="text-xs text-gray-500 pb-5">
                  If your TPA has a companion mobile interface, provide the URL here.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <Button variant="outline" type="button" onClick={() => navigate('/tpas')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EditTPA;