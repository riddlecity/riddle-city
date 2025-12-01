'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface QRScannerProps {
  onClose: () => void;
}

// Dynamically load ZXing library as fallback
const loadZXing = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).ZXing) {
      resolve((window as any).ZXing);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@zxing/library@latest/umd/index.min.js';
    script.onload = () => {
      if ((window as any).ZXing) {
        resolve((window as any).ZXing);
      } else {
        reject(new Error('ZXing failed to load'));
      }
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default function QRScanner({ onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const router = useRouter();
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const codeReaderRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const startScanning = async () => {
      try {
        // Try BarcodeDetector first (Chrome, Edge)
        if ('BarcodeDetector' in window) {
          console.log('Using native BarcodeDetector');
          
          // Request camera access with back camera preferred
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          });

          if (!mounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          streamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }

          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['qr_code']
          });
          
          scanIntervalRef.current = setInterval(async () => {
            if (!videoRef.current || !canvasRef.current || !scanning) return;

            const canvas = canvasRef.current;
            const video = videoRef.current;
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            try {
              const barcodes = await barcodeDetector.detect(canvas);
              
              if (barcodes.length > 0 && mounted) {
                const qrCode = barcodes[0].rawValue;
                handleQRCodeDetected(qrCode);
              }
            } catch (err) {
              console.error('Barcode detection error:', err);
            }
          }, 500);
        } else {
          // Fallback to ZXing library (Safari, Firefox, older browsers)
          console.log('BarcodeDetector not available, using ZXing...');
          
          const ZXing = await loadZXing();
          console.log('ZXing loaded successfully');
          
          const codeReader = new ZXing.BrowserQRCodeReader();
          codeReaderRef.current = codeReader;
          
          // Use decodeFromConstraints for continuous scanning
          await codeReader.decodeFromConstraints(
            {
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              }
            },
            videoRef.current,
            (result: any, error: any) => {
              if (result && mounted && scanning) {
                console.log('QR Code detected with ZXing:', result.text);
                handleQRCodeDetected(result.text);
              }
              // Errors are normal while searching - only log unexpected ones
              if (error && error.name !== 'NotFoundException') {
                console.error('ZXing error:', error);
              }
            }
          );
        }
      } catch (err: any) {
        console.error('Scanner error:', err);
        if (mounted) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setError('Camera access denied. Please enable camera permissions.');
          } else if (err.name === 'NotFoundError') {
            setError('No camera found on this device.');
          } else {
            setError('Unable to start camera. Please try again.');
          }
        }
      }
    };

    const handleQRCodeDetected = async (qrCodeUrl: string) => {
      console.log('QR Code detected:', qrCodeUrl);
      setScanning(false);
      setProcessingMessage('Verifying QR code...');
      
      try {
        const url = new URL(qrCodeUrl);
        
        // Check if it's a Riddle City QR location scan
        if (url.pathname.includes('/api/qr/location/')) {
          // Extract location ID and params
          const pathParts = url.pathname.split('/');
          const locationId = pathParts[pathParts.length - 1];
          const token = url.searchParams.get('token');
          const ts = url.searchParams.get('ts');
          
          // Call a JSON endpoint instead of following redirect
          const response = await fetch(`/api/qr/verify?locationId=${locationId}&token=${token}&ts=${ts}`);
          const data = await response.json();
          
          if (!response.ok) {
            // Show error message
            setProcessingMessage(null);
            setError(data.message || 'Invalid QR code');
            
            // Auto close after 3 seconds
            setTimeout(() => {
              cleanup();
              onClose();
            }, 3000);
            return;
          }
          
          // Show success message
          setProcessingMessage(null);
          setSuccessMessage(data.message || '✓ Code found! Moving to next riddle...');
          
          // Trigger manual sync for all group members
          window.dispatchEvent(new Event('riddleSyncTrigger'));
          
          // Wait a moment then navigate
          setTimeout(() => {
            cleanup();
            
            // Check if it's an external URL (like library website)
            if (data.redirectUrl.startsWith('http://') || data.redirectUrl.startsWith('https://')) {
              window.location.href = data.redirectUrl;
            } else {
              router.push(data.redirectUrl);
            }
          }, 1500);
        } else {
          // Not a riddle QR code - just navigate
          if (url.hostname.includes('riddlecity') || url.hostname.includes('localhost')) {
            router.push(url.pathname + url.search);
          } else {
            window.location.href = qrCodeUrl;
          }
        }
      } catch (err) {
        console.error('Invalid QR code URL:', err);
        setProcessingMessage(null);
        setError('Invalid QR code format');
        
        // Auto close after 3 seconds
        setTimeout(() => {
          cleanup();
          onClose();
        }, 3000);
      }
    };

    const cleanup = () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      
      // Clean up ZXing reader if it exists
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch (err) {
          console.error('Error cleaning up ZXing reader:', err);
        }
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };

    startScanning();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [router, scanning]);

  const handleClose = () => {
    setScanning(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black/90 backdrop-blur-sm p-4 flex items-center justify-between border-b border-white/10">
        <h2 className="text-white text-lg font-semibold">Scan QR Code</h2>
        <button
          onClick={handleClose}
          className="text-white/80 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all active:scale-95"
        >
          ×
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        <canvas
          ref={canvasRef}
          className="hidden"
        />

        {/* Scanning overlay - show for both native and ZXing */}
        {scanning && !error && !processingMessage && !successMessage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-64 h-64">
              {/* Corner guides */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-red-500 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-red-500 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-red-500 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-red-500 rounded-br-lg"></div>
              
              {/* Scanning line animation */}
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scan"></div>
            </div>
          </div>
        )}

        {/* Processing message */}
        {processingMessage && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-blue-900/90 backdrop-blur-sm border border-blue-500/50 rounded-xl p-6 max-w-md text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
              <p className="text-white font-medium">{processingMessage}</p>
            </div>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-green-900/90 backdrop-blur-sm border border-green-500/50 rounded-xl p-6 max-w-md text-center animate-in fade-in duration-300">
              <div className="text-5xl mb-3">✓</div>
              <p className="text-white font-medium text-lg">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-red-900/90 backdrop-blur-sm border border-red-500/50 rounded-xl p-6 max-w-md text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-white font-medium mb-4">{error}</p>
              <button
                onClick={handleClose}
                className="bg-white/20 hover:bg-white/30 text-white font-medium px-6 py-2 rounded-lg transition-all active:scale-95"
              >
                Close Scanner
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!error && 'BarcodeDetector' in window && (
        <div className="bg-black/90 backdrop-blur-sm p-4 text-center border-t border-white/10">
          <p className="text-white/80 text-sm">
            Point your camera at the QR code to scan
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0%;
          }
          100% {
            top: 100%;
          }
        }
        
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
