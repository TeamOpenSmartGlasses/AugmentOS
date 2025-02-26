// components/dialogs/DeleteDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { TPA } from "@/types/tpa";

interface DeleteDialogProps {
  tpa: TPA | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: (packageName: string) => void;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ 
  tpa, 
  open, 
  onOpenChange, 
  onConfirmDelete 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (!tpa) return;
    
    setIsDeleting(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Call the passed callback with the packageName
      onConfirmDelete(tpa.packageName);
      
      // Close dialog after deletion
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting TPA:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Delete TPA
          </DialogTitle>
          <DialogDescription>
            {tpa && `Are you sure you want to delete ${tpa.name}?`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              This action cannot be undone. This will permanently delete the TPA
              and remove all associated data.
            </AlertDescription>
          </Alert>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              To confirm, you're deleting:
            </p>
            <p className="mt-2 font-medium">
              {tpa?.name} <span className="font-mono text-xs text-gray-500">({tpa?.packageName})</span>
            </p>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete TPA'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteDialog;