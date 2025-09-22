import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesUploaded: (files: File[]) => void;
  currentFileCount: number;
  isUploading?: boolean;
}

const MAX_FILES = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['application/pdf'];

export const UploadModal = ({ 
  isOpen, 
  onClose, 
  onFilesUploaded, 
  currentFileCount,
  isUploading = false
}: UploadModalProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `${file.name}: Only PDF files are supported`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File size must be under 10MB`;
    }
    if (currentFileCount + selectedFiles.length >= MAX_FILES) {
      return `Cannot exceed ${MAX_FILES} files total`;
    }
    return null;
  };

  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    // Filter out duplicates
    const existingNames = selectedFiles.map(f => f.name);
    
    fileArray.forEach(file => {
      if (existingNames.includes(file.name)) {
        newErrors.push(`${file.name}: File already selected`);
        return;
      }
      
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    setErrors(prev => [...prev.filter(e => !fileArray.some(f => e.includes(f.name))), ...newErrors]);
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, [selectedFiles, currentFileCount]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    const removedFile = selectedFiles[index];
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    // Remove related errors
    setErrors(prev => prev.filter(error => !error.includes(removedFile.name)));
  };

  const clearAllErrors = () => {
    setErrors([]);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      // Clear any existing errors
      clearAllErrors();
      
      // Call the parent function
      await onFilesUploaded(selectedFiles);
      
      // Reset state on successful upload
      setSelectedFiles([]);
      setErrors([]);
    } catch (error: any) {
      // Handle upload errors
      setErrors([`Upload failed: ${error?.message || 'Please try again'}`]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const canUpload = selectedFiles.length > 0 && !isUploading && currentFileCount + selectedFiles.length <= MAX_FILES;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl h-[90vh] sm:h-[85vh] flex flex-col mx-4 sm:mx-auto p-0 gap-0">
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 pb-4 border-b border-border/50">
          <DialogHeader>
            <DialogTitle className="heading-sans text-xl sm:text-2xl font-light">
              Upload Legal Documents
            </DialogTitle>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3">
              <Badge variant="secondary" className="self-start">
                {currentFileCount + selectedFiles.length} / {MAX_FILES} PDFs
              </Badge>
              <p className="text-sm text-muted-foreground font-light">
                Max 10MB per file
              </p>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-6 space-y-4 sm:space-y-6">
            {/* Supported Documents Info */}
            <Card className="p-4 sm:p-6 bg-gradient-primary/3 border-0 shadow-soft">
              <h4 className="font-medium text-sm mb-3 text-foreground">Supported Documents</h4>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {["Contracts", "Loan Agreements", "Rental Agreements", "Terms & Conditions", "NDAs", "Employment Agreements"].map((type) => (
                  <Badge key={type} variant="outline" className="text-xs font-light border-border/50">
                    {type}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Upload Area */}
            <Card
              className={`border-2 border-dashed p-6 sm:p-12 text-center cursor-pointer transition-smooth rounded-2xl ${
                dragActive 
                  ? 'border-primary bg-gradient-primary/5 shadow-soft' 
                  : 'border-border/50 hover:border-primary/30 hover:bg-gradient-primary/2 hover:shadow-soft'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isUploading && document.getElementById('file-input')?.click()}
            >
              {isUploading ? (
                <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 sm:mb-6 text-primary animate-spin" />
              ) : (
                <Upload className={`h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 sm:mb-6 ${
                  dragActive ? 'text-primary' : 'text-muted-foreground'
                }`} />
              )}
              <h3 className="font-medium mb-2 sm:mb-3 text-base sm:text-lg">
                {isUploading ? 'Uploading files...' : dragActive ? 'Drop files here' : 'Upload PDF Documents'}
              </h3>
              <p className="text-muted-foreground mb-4 sm:mb-6 font-light leading-relaxed text-sm sm:text-base px-2">
                {isUploading ? 'Please wait while your files are being processed' : 'Drag and drop your files here, or click to browse'}
              </p>
              {!isUploading && (
                <Button variant="outline" className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-medium text-sm sm:text-base">
                  Choose Files
                </Button>
              )}
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileInput}
                className="hidden"
                disabled={isUploading}
              />
            </Card>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h4 className="font-medium text-sm">Selected Files ({selectedFiles.length})</h4>
                  {!isUploading && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedFiles([])}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 sm:px-3"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="space-y-2 sm:space-y-3 max-h-64 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted/20 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-primary/60">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-xl border-0 shadow-soft">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground font-light">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg hover:bg-muted flex-shrink-0"
                        >
                          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-destructive">Upload Errors ({errors.length})</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearAllErrors}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 sm:px-3"
                  >
                    Clear
                  </Button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-2 pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted/20 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-destructive/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-destructive/60">
                  {errors.map((error, index) => (
                    <div key={index} className="flex items-start gap-2 p-2.5 sm:p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <p className="text-xs sm:text-sm text-destructive leading-relaxed">{error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 pt-4 border-t border-border/50">
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isUploading} 
              className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-medium text-sm sm:text-base order-2 sm:order-1"
            >
              {isUploading ? 'Please Wait...' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!canUpload}
              className="bg-gradient-primary hover:shadow-glow-primary px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-medium text-sm sm:text-base order-1 sm:order-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};