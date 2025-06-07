"use client";

// Update this component based on your authentication setup
// This is a generic example - adjust according to your auth provider

import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // Replace this with your actual sign out logic
      // Examples for different auth providers:
      
      // For NextAuth.js:
      // await signOut({ redirect: false });
      
      // For Supabase:
      // await supabase.auth.signOut();
      
      // For Clerk:
      // await signOut();
      
      // For Auth0:
      // logout({ returnTo: window.location.origin });
      
      // Generic example (replace with your auth logic):
      console.log("Signing out...");
      
      // Redirect to home or login page
      router.push("/sign-in");
      
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <button 
      onClick={handleSignOut}
      className="flex w-full items-center text-left"
    >
      Log out
    </button>
  );
}