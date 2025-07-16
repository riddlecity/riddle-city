"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function JoinGroupPage() {
  const router = useRouter();
  const params = useParams();
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(true);

  const groupId =
    typeof params?.groupId === "string"
      ? params.groupId
      : Array.isArray(params?.groupId)
      ? params.groupId[0]
      : "";

  useEffect(() => {
    if (!groupId) {
      setError("Invalid group ID");
      setIsJoining(false);
      return;
    }

    const joinGroup = async () => {
      try {
        setIsJoining(true);
        setError(null);
        
        console.log('Attempting to join group:', groupId);
        
        // Changed to match your API's expected format
        const res = await fetch("/api/join-group", {
          method: "POST",
          headers: { 
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
          },
          body: new URLSearchParams({ groupId }), // Changed from JSON to form data
        });

        console.log('Response status:', res.status);
        console.log('Response headers:', Object.fromEntries(res.headers.entries()));

        // Check if response is actually JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Response is not JSON, content-type:', contentType);
          const textResponse = await res.text();
          console.error('Response text (first 500 chars):', textResponse.substring(0, 500));
          setError("Server error - please try again");
          setIsJoining(false);
          return;
        }

        const data = await res.json();
        console.log('Join response data:', data);

        if (!res.ok) {
          console.error("Join group error:", data.error);
          setError(data.error || "Failed to join group");
          setIsJoining(false);
          return;
        }

        // Handle different possible response formats from your API
        let riddleId = null;
        if (data.nextRiddle) {
          riddleId = data.nextRiddle;
        } else if (data.currentRiddleId) {
          riddleId = data.currentRiddleId;
        } else if (data.nextRiddleId) {
          riddleId = data.nextRiddleId;
        }

        if (!riddleId) {
          console.error("No riddle ID returned:", data);
          setError("Group joined, but no starting riddle was found.");
          setIsJoining(false);
          return;
        }

        console.log('Success! Redirecting to riddle:', riddleId);
        // Success – redirect to first riddle
        router.replace(`/riddle/${riddleId}`);
        
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("Unexpected error joining group");
        setIsJoining(false);
      }
    };

    joinGroup();
  }, [groupId, router]);

  if (isJoining) {
    return (
      <main className="min-h-screen bg-neutral-900 flex items-center justify-center text-white text-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Joining game…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-900 flex items-center justify-center px-6 py-10">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Could Not Join Group</h1>
          <p className="text-neutral-300 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Try Again
            </button>
            <a 
              href="/riddlecity" 
              className="block w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Go to Riddle City
            </a>
          </div>
          
          {/* Debug info */}
          <details className="mt-6 text-left">
            <summary className="text-neutral-400 text-sm cursor-pointer hover:text-neutral-300">
              Debug Info
            </summary>
            <div className="mt-2 text-xs text-neutral-500 bg-neutral-800 rounded p-3 font-mono">
              <div>Group ID: {groupId}</div>
              <div>Error: {error}</div>
              <div>Path: /join/{groupId}</div>
            </div>
          </details>
        </div>
      </main>
    );
  }

  return null;
}