"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, File, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onUploadComplete?: (file: File) => void;
  onCancel?: () => void;
}

export function FileUploader({ onUploadComplete, onCancel }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (selectedFile: File) => {
    setError(null);
    if (selectedFile.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return false;
    }
    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB
      setError("File size must be less than 10MB.");
      return false;
    }
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const simulateUpload = () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            if (onUploadComplete) onUploadComplete(file);
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="w-full">
      {!file ? (
        <div
          className={cn(
            "relative flex flex-col items-center justify-center p-12 mt-2 border-2 border-dashed rounded-lg transition-colors bg-muted/20",
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/50",
            error ? "border-destructive/50 bg-destructive/5" : ""
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleChange}
          />
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="p-4 bg-background rounded-full shadow-sm border border-border">
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                <span className="text-primary hover:underline">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                PDF up to 10MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-background">
            <div className="p-2.5 bg-primary/10 rounded-lg text-primary shrink-0">
              <File className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              
              {isUploading && (
                <div className="w-full h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-200 ease-out" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
            {!isUploading && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setFile(null)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove file</span>
              </Button>
            )}
            {isUploading && uploadProgress === 100 && (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            )}
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onCancel} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={simulateUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload and Analyze"
              )}
            </Button>
          </div>
        </div>
      )}
      
      {error && (
        <p className="flex items-center text-sm text-destructive font-medium mt-3">
          <AlertCircle className="w-4 h-4 mr-1.5" />
          {error}
        </p>
      )}
    </div>
  );
}
