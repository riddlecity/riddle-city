"use client";

import { useState, useRef } from "react";
import { Camera, Image as ImageIcon, X } from "lucide-react";

interface PhotoCaptureProps {
  riddleId: string;
  groupId: string;
  onPhotoTaken?: () => void;
}

export default function PhotoCapture({ riddleId, groupId, onPhotoTaken }: PhotoCaptureProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if photo already exists for this riddle
  const existingPhoto = typeof window !== "undefined" 
    ? localStorage.getItem(`riddlecity_photo_${groupId}_${riddleId}`)
    : null;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error("Camera access denied:", error);
      alert("Please allow camera access to take photos");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    
    // Compress to reasonable size (0.7 quality JPEG)
    const compressedPhoto = canvas.toDataURL("image/jpeg", 0.7);
    
    // Store in localStorage
    localStorage.setItem(`riddlecity_photo_${groupId}_${riddleId}`, compressedPhoto);
    
    setPhoto(compressedPhoto);
    stopCamera();
    
    if (onPhotoTaken) onPhotoTaken();
  };

  const deletePhoto = () => {
    localStorage.removeItem(`riddlecity_photo_${groupId}_${riddleId}`);
    setPhoto(null);
  };

  const currentPhoto = photo || existingPhoto;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border-2 border-purple-200">
      <div className="flex items-center gap-2 mb-3">
        <Camera className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-purple-900">Team Photo</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">
        📸 Snap a team photo to create your collage at the end!
      </p>

      {!showCamera && !currentPhoto && (
        <button
          onClick={startCamera}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Camera className="w-5 h-5" />
          Take Team Photo
        </button>
      )}

      {showCamera && (
        <div className="space-y-3">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-auto"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={capturePhoto}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              📸 Capture
            </button>
            <button
              onClick={stopCamera}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {currentPhoto && !showCamera && (
        <div className="space-y-3">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <img src={currentPhoto} alt="Team photo" className="w-full h-auto" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={startCamera}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              📸 Retake Photo
            </button>
            <button
              onClick={deletePhoto}
              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
              title="Delete photo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-center text-green-600 font-medium">
            ✓ Photo saved for collage
          </p>
        </div>
      )}
    </div>
  );
}
