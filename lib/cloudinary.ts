// Cloudinary configuration and upload helper
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(dataUrl: string, filename: string) {
  try {
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: "World Mental Health Day 2026",
      public_id: filename,
      overwrite: true,
      resource_type: "image",
    });

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
