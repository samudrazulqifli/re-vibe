import { NextResponse } from 'next/server';
import { uploadFile } from '@/src/lib/storage';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `uploads/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    
    // Note: User mentioned 're-vibe-uploads' bucket
    // We should handle missing env gracefully
    const bucketName = process.env.GCS_BUCKET_NAME || 're-vibe-uploads';
    
    const publicUrl = await uploadFile(bucketName, fileName, buffer, file.type);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
