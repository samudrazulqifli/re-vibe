import { Storage } from '@google-cloud/storage';

let storage: Storage | null = null;

export function getStorage() {
  if (storage) return storage;

  const projectId = process.env.GCS_PROJECT_ID;
  const inlineJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (inlineJson) {
    storage = new Storage({
      projectId,
      credentials: JSON.parse(inlineJson),
    });
  } else if (keyFilePath) {
    storage = new Storage({
      projectId,
      keyFilename: keyFilePath,
    });
  } else {
    storage = new Storage({ projectId });
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

  try {
    await file.makePublic();
  } catch (err: any) {
    const msg = String(err?.message || '');
    const isUniformAccess =
      err?.code === 400 || err?.code === 412 || msg.includes('uniform bucket-level access');
    if (!isUniformAccess) throw err;
  }

  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}
