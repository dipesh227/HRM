import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from './Button';

interface ImageUploadProps {
  label?: string;
  currentImage?: string;
  onImageSelected: (file: File | null) => void;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ label, currentImage, onImageSelected, className = '' }) => {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
        alert("Please upload an image file");
        return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    onImageSelected(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering click on parent
    setPreview(null);
    onImageSelected(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={className}>
      {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">{label}</label>}
      <div 
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 h-40 flex flex-col items-center justify-center
          ${isDragging 
            ? 'border-ios-blue bg-blue-50 dark:bg-blue-900/20' 
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'}
        `}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleChange} 
        />

        {preview ? (
          <>
            <img 
              src={preview} 
              alt="Preview" 
              loading="lazy" 
              className="w-full h-full object-contain p-2" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <p className="text-white font-medium text-sm">Click to Change</p>
            </div>
            <button 
              onClick={clearImage}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors z-10"
              title="Remove Image"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center p-4 text-center">
             <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-3">
                <ImageIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
             </div>
             <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Click or Drop Image
             </p>
             <p className="text-xs text-slate-400 mt-1">
                Supports JPG, PNG
             </p>
          </div>
        )}
      </div>
    </div>
  );
};