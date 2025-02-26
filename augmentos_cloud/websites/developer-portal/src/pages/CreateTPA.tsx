// CreateTPA.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { ArrowLeftIcon } from "lucide-react";
import DashboardLayout from '@/components/DashboardLayout';

const CreateTPA: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Main content */}

        <div className="max-w-3xl mx-auto">
          <div className="flex items-center mb-6">
            <Link to="/dashboard" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeftIcon className="mr-1 h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Create New TPA</CardTitle>
              <CardDescription>
                Fill out the form below to register your Third-Party Application for AugmentOS.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="packageName">Package Name</Label>
                <Input
                  id="packageName"
                  placeholder="e.g., org.example.myapp"
                />
                <p className="text-xs text-gray-500">
                  Must use lowercase letters, numbers, dots, and hyphens only. This is a unique identifier and cannot be changed later.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
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
                  placeholder="https://yourserver.com/webview"
                />
                <p className="text-xs text-gray-500">
                  If your TPA has a companion mobile interface, provide the URL here.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tpaType">TPA Type</Label>
                <Select defaultValue="standard">
                  <SelectTrigger id="tpaType">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="background">Background</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Standard TPAs provide UI elements. Background TPAs run without direct user interaction.
                </p>
              </div>

              {/* Testers section */}
              <div className="pt-4 space-y-2">
                <Label htmlFor="testers">Add Testers (Optional)</Label>
                <Input
                  id="testers"
                  placeholder="Enter email addresses separated by commas"
                />
                <p className="text-xs text-gray-500">
                  Invite users to test your TPA before making it publicly available.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <Button variant="outline" asChild>
                <Link to="/dashboard">Cancel</Link>
              </Button>
              <Button>Create TPA</Button>
            </CardFooter>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default CreateTPA;