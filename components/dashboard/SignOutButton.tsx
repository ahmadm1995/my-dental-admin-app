"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.refresh(); // Clears any cached user data
      router.push('/sign-in'); // Redirects to sign-in page
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