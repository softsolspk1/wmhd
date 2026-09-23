'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  PhotoIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ImageUploadWithCropProps {
  onImageChange: (imageData: string | undefined) => void;
  initialImage?: string;
}

export const ImageUploadWithCrop: React.FC<ImageUploadWithCropProps> = ({
  onImageChange,
  initialImage,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImage || null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(initialImage || null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const cropAreaRef = useRef<HTMLDivElement>(null);

  // Target aspect ratio matches the square banner photo frame
  const targetAspect = 1;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WebP)');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image file size must be less than 15MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Mouse & Touch Pan controls inside crop modal
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Export cropped image using HTML5 Canvas at High Resolution
  const applyCrop = () => {
    if (!imageSrc || !imgRef.current || !cropAreaRef.current) return;

    const cropBox = cropAreaRef.current.getBoundingClientRect();
    const imgBox = imgRef.current.getBoundingClientRect();

    // High resolution square output canvas, placed into the square photo frame on the banner
    const exportWidth = 900;
    const exportHeight = 900;

    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Calculate mapping from displayed image coordinates to source image natural coordinates
    const scaleToNatural = imgRef.current.naturalWidth / imgBox.width;

    const sourceCropX = (cropBox.left - imgBox.left) * scaleToNatural;
    const sourceCropY = (cropBox.top - imgBox.top) * scaleToNatural;
    const sourceCropW = cropBox.width * scaleToNatural;
    const sourceCropH = cropBox.height * scaleToNatural;

    const originalImg = new Image();
    originalImg.onload = () => {
      ctx.drawImage(
        originalImg,
        sourceCropX,
        sourceCropY,
        sourceCropW,
        sourceCropH,
        0,
        0,
        exportWidth,
        exportHeight
      );

      const croppedDataUrl = canvas.toDataURL('image/png');
      setCroppedPreview(croppedDataUrl);
      onImageChange(croppedDataUrl);
      setIsCropModalOpen(false);
      toast.success('Photo ready and positioned!');
    };
    originalImg.src = imageSrc;
  };

  const handleRemove = () => {
    setImageSrc(null);
    setCroppedPreview(null);
    onImageChange(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Photo removed');
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {!croppedPreview ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="group relative cursor-pointer border-2 border-dashed border-sky-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-sky-50/50 hover:bg-emerald-50/30 transition-all duration-200"
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center text-sky-600 group-hover:text-emerald-600 group-hover:scale-110 transition-transform">
              <PhotoIcon className="w-7 h-7" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm sm:text-base">
                Click or drag & drop to upload your photo
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG or WebP (max 15MB) • 1 image only
              </p>
            </div>
            <span className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full bg-sky-100 text-sky-800 group-hover:bg-emerald-100 group-hover:text-emerald-800 transition-colors">
              📸 Upload Portrait
            </span>
          </div>
        </div>
      ) : (
        <div className="relative bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-inner flex-shrink-0 bg-gray-100">
            <img
              src={croppedPreview}
              alt="Cropped Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm mb-1">
              <CheckIcon className="w-4 h-4 stroke-[3]" />
              <span>Photo Attached</span>
            </div>
            <p className="text-xs text-gray-500 mb-3 truncate">
              Ready for the official banner frame
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsCropModalOpen(true)}
                className="px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors flex items-center gap-1"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                Adjust Crop
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crop & Reposition Modal */}
      <AnimatePresence>
        {isCropModalOpen && imageSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700 flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between text-white">
                <div>
                  <h3 className="font-bold text-base">Adjust Photo Framing</h3>
                  <p className="text-xs text-gray-400">Drag to reposition, use slider to zoom</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Crop Viewing Container */}
              <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[320px] select-none">
                <div
                  ref={cropAreaRef}
                  style={{
                    aspectRatio: `${targetAspect}`,
                    width: 'min(300px, 75vw)',
                  }}
                  className="relative rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-none z-10 overflow-hidden"
                >
                  <div className="absolute inset-0 rounded-2xl border border-white/30" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
                </div>

                <div
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center"
                >
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Source"
                    draggable={false}
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                      maxWidth: '85%',
                      maxHeight: '85%',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="p-4 bg-gray-900 border-t border-gray-800 space-y-4">
                <div className="flex items-center gap-3">
                  <MagnifyingGlassMinusIcon className="w-5 h-5 text-gray-400" />
                  <input
                    type="range"
                    min="0.6"
                    max="3.0"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-emerald-500 cursor-pointer h-2 bg-gray-700 rounded-lg"
                  />
                  <MagnifyingGlassPlusIcon className="w-5 h-5 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setPan({ x: 0, y: 0 });
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                  >
                    Reset
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCropModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyCrop}
                    className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl shadow-lg transition-all"
                  >
                    Confirm & Apply
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageUploadWithCrop;