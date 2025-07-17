"use client";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function PreferencesPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const location = (params?.location as string) || "unknown";
const mode = (params?.mode as string) || "unknown";
  const [players, setPlayers] = useState(2);
  const [teamName, setTeamName] = useState("");
  const [emails, setEmails] = useState<string[]>(["", ""]);
  const [loading, setLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Fun team name suggestions
  const teamSuggestions = [
    'Mystery Masters', 'The Puzzle Squad', 'Riddle Runners', 'Code Crackers',
    'Date Detectives', 'Adventure Squad', 'The Explorers', 'Barnsley Bunch',
    'Riddle Rebels', 'Mystery Makers', 'Puzzle Partners', 'The Think Tank',
    'Dream Team', 'The Sleuths', 'Quest Squad', 'Brain Trust'
  ];

  const getRandomSuggestion = () => {
    const randomSuggestion = teamSuggestions[Math.floor(Math.random() * teamSuggestions.length)];
    setTeamName(randomSuggestion);
  };

  // Check if we're returning from successful payment
  useEffect(() => {
    const sessionId = searchParams?.get('session_id');
const success = searchParams?.get('success');

    
    if (sessionId && success === 'true') {
      handlePaymentSuccess(sessionId);
    }
  }, [searchParams]);

  const handlePaymentSuccess = async (sessionId: string) => {
    setIsProcessingPayment(true);
    try {
      // Create the group after successful payment
      const createGroupRes = await fetch("/api/create-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          track_id: `${mode}_${location}`, // e.g., "date_barnsley"
          player_limit: players,
          team_name: teamName.trim() // Include team name
        }),
      });

      if (!createGroupRes.ok) {
        throw new Error("Failed to create group");
      }

      const { groupId, userId, success } = await createGroupRes.json();
      
      if (!success || !groupId || !userId) {
        throw new Error("Invalid response from create-group");
      }

      // Set cookies manually (since we're on client side)
      const expires = new Date(Date.now() + 86400000); // 1 day
      document.cookie = `group_id=${groupId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
      document.cookie = `user_id=${userId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;

      console.log("✅ Group created successfully:", { groupId, userId });

      // Get the starting riddle
      const groupRes = await fetch(`/api/groups/${groupId}`);
      if (groupRes.ok) {
        const groupData = await groupRes.json();
        if (groupData.current_riddle_id) {
          // Redirect to the first riddle
          router.push(`/riddle/${groupData.current_riddle_id}`);
          return;
        }
      }

      // Fallback: redirect to a default riddle or error page
      console.error("Could not get starting riddle");
      alert("Group created but couldn't get starting riddle. Please try again.");
      
    } catch (error) {
      console.error("❌ Payment success handling error:", error);
      alert("Payment succeeded but group creation failed. Please contact support.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleStart = async () => {
    // Validate team name
    if (!teamName.trim()) {
      alert('Please enter a team name!');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          location, 
          mode, 
          players, 
          emails, 
          teamName: teamName.trim() // Include team name in checkout
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Non-OK response from API:", errorText);
        throw new Error("Checkout session failed");
      }

      const body = await res.json();
      console.log("✅ Response from /api/checkout-session:", body);
      const { sessionUrl, error } = body;

      if (error) {
        console.error("❌ API returned error:", error);
        throw new Error(`API error: ${error}`);
      }

      if (!sessionUrl || typeof sessionUrl !== "string") {
        console.error("❌ Invalid sessionUrl in response:", body);
        throw new Error("Invalid sessionUrl returned from /api/checkout-session");
      }

      // Redirect to Stripe checkout
      window.location.href = sessionUrl;
    } catch (err) {
      console.error("❌ Checkout error:", err);
      alert("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handlePlayerChange = (value: number) => {
    setPlayers(value);
    setEmails((prev) => {
      const updated = [...prev];
      while (updated.length < value) updated.push("");
      return updated.slice(0, value);
    });
  };

  // Show processing state when handling payment success
  if (isProcessingPayment) {
    return (
      <main className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-6">Payment Successful!</h1>
          <p className="text-lg mb-4">Creating your adventure...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 py-16">
      <h1 className="text-4xl sm:text-5xl font-extrabold mb-10 text-center tracking-tight">
        Start your {mode} in {location}
      </h1>
      
      <div className="w-full max-w-lg space-y-6">
        {/* Number of players */}
        <div className="text-center">
          <label className="block text-lg font-medium mb-4">
            Number of players:
          </label>
          <select
            value={players}
            onChange={(e) => handlePlayerChange(parseInt(e.target.value))}
            className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {Array.from({ length: 5 }, (_, i) => i + 2).map((n) => (
              <option key={n} value={n} className="bg-neutral-800">
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Team Name */}
        <div>
          <label className="block text-lg font-medium mb-2">
            Team Name:
          </label>
          <div className="space-y-3">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter your team name..."
              maxLength={30}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={getRandomSuggestion}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200"
              >
                💡 Get random suggestion
              </button>
              <span className="text-xs text-white/50">
                {teamName.length}/30
              </span>
            </div>
          </div>
        </div>

        {/* Email fields */}
        <div className="space-y-4">
          {emails.map((email, index) => (
            <input
              key={index}
              type="email"
              placeholder={`Email for Player ${index + 1} (optional)`}
              value={email}
              onChange={(e) => handleEmailChange(index, e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          ))}
        </div>

        {/* Submit button */}
        <button
          onClick={handleStart}
          disabled={loading || !teamName.trim()}
          className={`w-full font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg ${
            loading || !teamName.trim()
              ? 'bg-gray-600 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:shadow-xl'
          } text-white`}
        >
          {loading ? "Loading..." : "Pay & Start Adventure"}
        </button>
      </div>
    </main>
  );
}