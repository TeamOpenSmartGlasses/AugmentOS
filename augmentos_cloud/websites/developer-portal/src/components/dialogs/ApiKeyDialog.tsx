// components/dialogs/ApiKeyDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, KeyRound, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { TPA } from "@/types/tpa"; // Assuming you have this type defined

interface ApiKeyDialogProps {
  tpa: TPA | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({ tpa, open, onOpenChange }) => {
  // Local states for dialog
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [apiKey, setApiKey] = useState("api_key_augmentos_12345abcdefghijklmnopqrstuvwxyz"); // Mock key
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Format API key to be partially masked
  const formatApiKey = (key: string): string => {
    if (!key) return "";
    const prefix = key.substring(0, 10);
    const suffix = key.substring(key.length - 5);
    return `${prefix}...${suffix}`;
  };

  // Copy API key to clipboard
  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Start regeneration process
  const handleStartRegenerate = () => {
    setShowConfirmation(true);
  };

  // Cancel regeneration
  const handleCancelRegeneration = () => {
    setShowConfirmation(false);
  };

  // Confirm regeneration
  const handleConfirmRegenerate = async () => {
    setIsRegenerating(true);
    setError(null);
    setSuccess(null);
    
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock new API key
      const newKey = `api_key_augmentos_${Math.random().toString(36).substring(2, 10)}`;
      setApiKey(newKey);
      setSuccess("API key regenerated successfully");
      setShowConfirmation(false);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to regenerate API key. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  // When dialog closes, reset states
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset states when dialog closes
      setShowConfirmation(false);
      setError(null);
      setSuccess(null);
      setIsCopied(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            API Key
          </DialogTitle>
          <DialogDescription>
            {tpa && `API key for ${tpa.name}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Success Alert */}
          {success && (
            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}
          
          {/* Regeneration Confirmation */}
          {showConfirmation ? (
            <div className="space-y-4">
              <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700">
                  Warning: Regenerating this API key will invalidate the previous key. 
                  Any applications using the old key will stop working.
                </AlertDescription>
              </Alert>
              <p className="text-sm text-gray-500">
                Are you sure you want to continue?
              </p>
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={handleCancelRegeneration}
                  disabled={isRegenerating}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleConfirmRegenerate}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? 
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Regenerating...
                    </> :
                    'Regenerate Key'
                  }
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-500">
                  Your API key is used to authenticate your TPA with AugmentOS cloud services.
                  Keep it secure and never share it publicly.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-sm p-2 border rounded-md bg-gray-50 overflow-x-auto">
                    {formatApiKey(apiKey)}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCopyApiKey}
                    className="shrink-0"
                  >
                    {isCopied ? 
                      <CheckCircle className="h-4 w-4 text-green-600" /> : 
                      <Copy className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Webhook URL</h3>
                <div className="font-mono text-sm p-2 border rounded-md bg-gray-50 overflow-x-auto">
                  {tpa?.webhookURL || 'No webhook URL defined'}
                </div>
              </div>
            </>
          )}
        </div>
        
        {!showConfirmation && (
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <p className="text-xs text-gray-500">
              Last regenerated: {new Date().toLocaleDateString()}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button variant="destructive" onClick={handleStartRegenerate}>
                Regenerate Key
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyDialog;