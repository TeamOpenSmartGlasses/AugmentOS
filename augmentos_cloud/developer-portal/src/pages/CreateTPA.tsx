// pages/CreateTPA.tsx
import React, { useState } from 'react';
import { AxiosError } from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, AlertCircle, CheckCircle } from "lucide-react";
// import { Switch } from "@/components/ui/switch";
import DashboardLayout from "../components/DashboardLayout";
import ApiKeyDialog from "../components/dialogs/ApiKeyDialog";
import api, { AppResponse } from '@/services/api.service';
import { AppI } from '@augmentos/sdk';
// import { TPA } from '@/types/tpa';

const CreateTPA: React.FC = () => {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<Partial<AppI>>({
    packageName: '',
    name: '',
    description: '',
    webhookURL: '',
    logoURL: '',
    webviewURL: '',
    // isPublic: false,
    // tpaType: TpaType.STANDARD
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // API key dialog state
  const [createdTPA, setCreatedTPA] = useState<AppResponse | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: Partial<AppI>) => ({
      ...prev,
      [name]: value
    }));

    // Clear error for field when changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Package name validation
    if (!formData.packageName) {
      newErrors.packageName = 'Package name is required';
    } else if (!/^[a-z0-9.-]+$/.test(formData.packageName)) {
      newErrors.packageName = 'Package name must use lowercase letters, numbers, dots, and hyphens only';
    }

    // Display name validation
    if (!formData.name) {
      newErrors.name = 'Display name is required';
    }

    // Description validation
    if (!formData.description) {
      newErrors.description = 'Description is required';
    }

    // Webhook URL validation
    if (!formData.webhookURL) {
      newErrors.webhookURL = 'Webhook URL is required';
    } else {
      try {
        new URL(formData.webhookURL);
      } catch (e) {
        console.error(e);
        newErrors.webhookURL = 'Please enter a valid URL';
      }
    }

    // Logo URL validation
    if (!formData.logoURL) {
      newErrors.logoURL = 'Logo URL is required';
    } else {
      try {
        new URL(formData.logoURL);
      } catch (e) {
        console.error(e);
        newErrors.logoURL = 'Please enter a valid URL';
      }
    }

    // Webview URL validation (optional)
    if (formData.webviewURL) {
      try {
        new URL(formData.webviewURL);
      } catch (e) {
        console.error(e);
        newErrors.webviewURL = 'Please enter a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      setFormError('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);
    setFormError(null);

    try {
      // Call API to create TPA
      const result = await api.apps.create(formData as AppI);

      console.log('TPA created:', result);

      // Set success message and state for dialog
      setSuccessMessage(`${formData.name} was created successfully!`);
      setCreatedTPA(result.tpa);
      setApiKey(result.apiKey);

      // Show API key dialog
      setTimeout(() => {
        setIsApiKeyDialogOpen(true);
      }, 100);

    } catch (error: unknown) {
      console.error('Error creating TPA:', error);

      const errorMessage = (error as AxiosError<{ error: string }>).response?.data?.error ||
        (error as Error).message ||
        'Failed to create TPA. Please try again.';

      if (errorMessage.includes('already exists')) {
        setErrors({
          ...errors,
          packageName: 'This package name is already taken. Please choose another one.'
        });
      }

      setFormError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle dialog close
  const handleApiKeyDialogClose = (open: boolean) => {
    setIsApiKeyDialogOpen(open);

    // Navigate to TPA list when dialog is closed
    if (!open) {
      navigate('/tpas');
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
              <CardTitle className="text-2xl">Create New TPA</CardTitle>
              <CardDescription>
                Fill out the form below to register your Third-Party Application for AugmentOS.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-5">
              {formError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="packageName">
                  Package Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="packageName"
                  name="packageName"
                  value={formData.packageName}
                  onChange={handleChange}
                  placeholder="e.g., org.example.myapp"
                  className={errors.packageName ? "border-red-500" : ""}
                />
                {errors.packageName && (
                  <p className="text-xs text-red-500 mt-1">{errors.packageName}</p>
                )}
                <p className="text-xs text-gray-500">
                  Must use lowercase letters, numbers, dots, and hyphens only. This is a unique identifier and cannot be changed later.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Display Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., My Awesome App"
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                )}
                <p className="text-xs text-gray-500">
                  The name that will be displayed to users in the AugmentOS app store.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe what your TPA does..."
                  rows={3}
                  className={errors.description ? "border-red-500" : ""}
                />
                {errors.description && (
                  <p className="text-xs text-red-500 mt-1">{errors.description}</p>
                )}
                <p className="text-xs text-gray-500">
                  Provide a clear, concise description of your application's functionality.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhookURL">
                  Webhook URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="webhookURL"
                  name="webhookURL"
                  value={formData.webhookURL}
                  onChange={handleChange}
                  placeholder="https://yourserver.com/webhook"
                  className={errors.webhookURL ? "border-red-500" : ""}
                />
                {errors.webhookURL && (
                  <p className="text-xs text-red-500 mt-1">{errors.webhookURL}</p>
                )}
                <p className="text-xs text-gray-500">
                  The endpoint where AugmentOS will send events when your TPA is activated.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoURL">
                  Logo URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="logoURL"
                  name="logoURL"
                  value={formData.logoURL}
                  onChange={handleChange}
                  placeholder="https://yourserver.com/logo.png"
                  className={errors.logoURL ? "border-red-500" : ""}
                />
                {errors.logoURL && (
                  <p className="text-xs text-red-500 mt-1">{errors.logoURL}</p>
                )}
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
                  className={errors.webviewURL ? "border-red-500" : ""}
                />
                {errors.webviewURL && (
                  <p className="text-xs text-red-500 mt-1">{errors.webviewURL}</p>
                )}
                <p className="text-xs text-gray-500 pb-5">
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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create TPA"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* API Key Dialog after successful creation */}
      {createdTPA && (
        <ApiKeyDialog
          tpa={createdTPA}
          apiKey={apiKey}
          open={isApiKeyDialogOpen}
          onOpenChange={handleApiKeyDialogClose}
        />
      )}
    </DashboardLayout>
  );
};

export default CreateTPA;