'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface QRScannerProps {
  onClose: () => void;
}

export default function QRScanner({ onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const router = useRouter();
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        // Request camera access with back camera preferred
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' }, // Prefer back camera
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
          videoRef.current.play();
          
          // Start scanning after video starts playing
          videoRef.current.onloadedmetadata = () => {
            startScanning();
          };
        }
      } catch (err) {
        console.error('Camera error:', err);
        if (mounted) {
          setError('Unable to access camera. Please check permissions.');
        }
      }
    };

    const startScanning = () => {
      // Check if BarcodeDetector is available
      if ('BarcodeDetector' in window) {
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
        }, 500); // Scan every 500ms
      } else {
        // Show alternative scanning instructions but keep camera open
        console.log('BarcodeDetector not available, showing manual instructions');
      }
    };

    const handleQRCodeDetected = (qrCodeUrl: string) => {
      console.log('QR Code detected:', qrCodeUrl);
      setScanning(false);
      
      // Stop camera
      cleanup();
      
      // Navigate to the QR code URL
      try {
        const url = new URL(qrCodeUrl);
        // If it's a Riddle City URL, navigate directly
        if (url.hostname.includes('riddlecity') || url.hostname.includes('localhost')) {
          router.push(url.pathname + url.search);
        } else {
          window.location.href = qrCodeUrl;
        }
      } catch (err) {
        console.error('Invalid QR code URL:', err);
        setError('Invalid QR code format');
      }
    };

    const cleanup = () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };

    startCamera();

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

        {/* Scanning overlay */}
        {scanning && !error && 'BarcodeDetector' in window && (
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

        {/* Fallback instructions for browsers without BarcodeDetector */}
        {scanning && !error && !('BarcodeDetector' in window) && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-black/80 backdrop-blur-sm border-2 border-white/20 rounded-xl p-6 max-w-md text-center">
              <div className="text-5xl mb-4">📱</div>
              <h3 className="text-white text-xl font-bold mb-3">Use Your Camera App</h3>
              <p className="text-white/80 text-sm mb-4 leading-relaxed">
                Your browser doesn't support automatic QR scanning. Please:
              </p>
              <ol className="text-white/90 text-sm text-left space-y-2 mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">1.</span>
                  <span>Open your phone's Camera app</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">2.</span>
                  <span>Point it at the QR code</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">3.</span>
                  <span>Tap the notification to continue your adventure</span>
                </li>
              </ol>
              <button
                onClick={handleClose}
                className="bg-white/20 hover:bg-white/30 text-white font-medium px-6 py-3 rounded-lg transition-all active:scale-95 w-full"
              >
                Got it, close this
              </button>
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
