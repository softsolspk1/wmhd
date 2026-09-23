// Types for World Mental Health Day 2026 Banner Generator

export interface WorldMentalHealthFormData {
  name: string;
  designation: string;
  organization: string;
  message: string;
  imageData?: string;
}

export interface ImageUploadState {
  file?: File;
  preview?: string;
  cropped?: string;
  isProcessing: boolean;
  error?: string;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}