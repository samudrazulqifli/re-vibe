import { useState, useRef, useCallback, useEffect } from 'react';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isInitializing, setIsInitializing] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (facingMode: 'user' | 'environment' = 'environment') => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setPermissionState('denied');
        setError('Browser ini tidak mendukung akses kamera. Coba browser lain atau pilih dari galeri.');
        return;
      }

      setIsInitializing(true);
      setError(null);

      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1350 } }, audio: false },
        { video: { facingMode }, audio: false },
        { video: true, audio: false },
      ];

      let lastErr: unknown = null;
      for (const constraints of attempts) {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia(constraints);
          streamRef.current = newStream;
          if (videoRef.current) {
            videoRef.current.srcObject = newStream;
          }
          setPermissionState('granted');
          setIsInitializing(false);
          return;
        } catch (err) {
          lastErr = err;
          const name = (err as { name?: string })?.name;
          if (name === 'NotAllowedError' || name === 'SecurityError') break;
        }
      }

      console.error('Camera access error:', lastErr);
      const name = (lastErr as { name?: string })?.name;
      setPermissionState('denied');
      setError(
        name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Aktifkan di pengaturan browser, lalu refresh.'
          : 'Kamera tidak tersedia di perangkat ini. Coba upload dari galeri.'
      );
      setIsInitializing(false);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !streamRef.current || !video.videoWidth || !video.videoHeight) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
    });
  }, []);

  return { videoRef, startCamera, stopCamera, capturePhoto, error, permissionState, isInitializing };
}
