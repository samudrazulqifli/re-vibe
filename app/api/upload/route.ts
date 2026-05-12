import { NextResponse } from 'next/server';
import { uploadFile } from '@/src/lib/storage';
import { requireAuthedUser } from '@/src/lib/firebase/api-auth';

export async function POST(req: Request) {
  const auth = await requireAuthedUser(req);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

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
    const safeName = file.name.replace(/\s+/g, '_');
    const fileName = `uploads/${uid}/${Date.now()}-${safeName}`;
    const bucketName = process.env.GCS_BUCKET_NAME || 're-vibe-uploads';
    const publicUrl = await uploadFile(bucketName, fileName, buffer, file.type);

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image', detail: error?.message || 'unknown' },
      { status: 500 }
    );
  }
}
