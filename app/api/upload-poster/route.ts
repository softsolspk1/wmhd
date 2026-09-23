// Imports
import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';
export async function POST(request: NextRequest) {
  try {
    const { dataUrl, filename } = await request.json();
    if (!dataUrl || !filename) {
      return NextResponse.json(
        { error: 'Missing dataUrl or filename' },
        { status: 400 }
      );
    }
    const result = await uploadToCloudinary(dataUrl, filename);
    if (result.success) {
      return NextResponse.json({
        success: true,
        url: result.url,
        public_id: result.public_id,
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}