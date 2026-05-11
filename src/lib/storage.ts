import { Storage } from '@google-cloud/storage';

let storage: Storage | null = null;

export function getStorage() {
  if (!storage) {
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (keyFile) {
      storage = new Storage({
        credentials: JSON.parse(keyFile)
      });
    } else {
      // Fallback for local dev or use GCS_PROJECT_ID if available
      storage = new Storage({
        projectId: process.env.GCS_PROJECT_ID
      });
    }
  }
  return storage;
}

export async function uploadFile(bucketName: string, fileName: string, buffer: Buffer, mimeType: string) {
  const storageClient = getStorage();
  const bucket = storageClient.bucket(bucketName);
  const file = bucket.file(fileName);

  await file.save(buffer, {
    contentType: mimeType,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });

  // Make public for the preview
  await file.makePublic();

  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}
