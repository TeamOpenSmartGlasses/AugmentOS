// components/dialogs/SharingDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Share2, LinkIcon, CheckCircle, X, InfoIcon } from "lucide-react";
import { TPA } from "@/types/tpa";

interface SharingDialogProps {
  tpa: TPA | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SharingDialog: React.FC<SharingDialogProps> = ({ tpa, open, onOpenChange }) => {
  // Local states for dialog
  const [email, setEmail] = useState('');
  const [sharedEmails, setSharedEmails] = useState<string[]>([]);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);
  
  // Generate installation link based on package name
  const getInstallationLink = (): string => {
    if (!tpa) return '';
    return `https://app.augmentos.org/install/${tpa.packageName}`;
  };
  
  // Check if email is valid
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  // Handle email input change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value) {
      setIsEmailValid(validateEmail(value));
    } else {
      setIsEmailValid(true);
    }
  };
  
  // Add email to the list
  const handleAddEmail = () => {
    if (!email || !isEmailValid) return;
    
    // Don't add duplicate emails
    if (!sharedEmails.includes(email)) {
      setSharedEmails([...sharedEmails, email]);
    }
    
    setEmail('');
  };
  
  // Remove email from the list
  const handleRemoveEmail = (emailToRemove: string) => {
    setSharedEmails(sharedEmails.filter(e => e !== emailToRemove));
  };
  
  // Copy installation link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(getInstallationLink()).then(() => {
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000);
    });
  };
  
  // When dialog closes, reset states
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // No need to reset shared emails so users don't lose their list
      setEmail('');
      setIsLinkCopied(false);
      setIsEmailValid(true);
    }
    onOpenChange(newOpen);
  };
  
  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && email && isEmailValid) {
      e.preventDefault();
      handleAddEmail();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share with Testers
          </DialogTitle>
          <DialogDescription>
            {tpa && `Share ${tpa.name} with testers`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {/* Installation Link Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Installation Link
            </h3>
            <p className="text-sm text-gray-500">
              Share this link with anyone to let them install your TPA:
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input 
                  readOnly
                  value={getInstallationLink()}
                  className="pr-10 font-mono text-sm"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0 ml-2"
              >
                {isLinkCopied ? 
                  <CheckCircle className="h-4 w-4 text-green-600" /> : 
                  <Copy className="h-4 w-4" />
                }
              </Button>
            </div>
          </div>
          
          {/* Tester Email List Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Testers</h3>
            <p className="text-sm text-gray-500">
              Keep track of who you've shared this TPA with:
            </p>
            
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Add tester email address"
                  value={email}
                  onChange={handleEmailChange}
                  onKeyPress={handleKeyPress}
                  className={!isEmailValid ? "border-red-500" : ""}
                />
                {!isEmailValid && (
                  <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
                )}
              </div>
              <Button 
                onClick={handleAddEmail}
                disabled={!email || !isEmailValid}
                className="shrink-0"
                size="sm"
              >
                Add
              </Button>
            </div>
            
            {/* Email List */}
            {sharedEmails.length > 0 ? (
              <div className="border rounded-md p-3">
                <div className="space-y-2">
                  {sharedEmails.map((email) => (
                    <div key={email} className="flex items-center justify-between">
                      <span className="text-sm">{email}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemoveEmail(email)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border rounded-md p-4 text-center">
                <p className="text-sm text-gray-500">No testers added yet</p>
              </div>
            )}
          </div>
          
          {/* Instruction Note */}
          <Alert className="bg-blue-50 text-blue-800 border-blue-200">
            <InfoIcon className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              Note: The system won't send emails automatically. Share the installation link with 
              your testers manually.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter className="mt-4">
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SharingDialog;