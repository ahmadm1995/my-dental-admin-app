// components/auth/auth-guard.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useAutoLogout } from '@/hooks/use-auto-logout'
import { LogoutWarningDialog } from '@/components/auth/logout-warning-dialog'

// Loading component
function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Checking authentication...</p>
      </div>
    </div>
  )
}

// Unauthorized component
function Unauthorized() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You need to be signed in to access this page.</p>
        <a 
          href="/auth/signin" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
        >
          Sign In
        </a>
      </div>
    </div>
  )
}

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWarning, setShowWarning] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { resetTimer, logout } = useAutoLogout({
    timeoutMinutes: 10, // Auto logout after 10 minutes
    warningMinutes: 2,  // Show warning 2 minutes before logout
    onWarning: () => setShowWarning(true),
    onLogout: () => {
      setShowWarning(false)
      // The logout will be handled by the auth state change listener
    }
  })

  const handleContinueSession = () => {
    setShowWarning(false)
    resetTimer() // Reset the timer when user chooses to continue
  }

  const handleLogoutNow = () => {
    setShowWarning(false)
    logout()
  }

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)

      // If no user, redirect to sign in
      if (!session?.user) {
        router.push('/sign-in')
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_OUT' || !session?.user) {
          setShowWarning(false) // Hide warning dialog if shown
          router.push('/sign-in')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, router])

  // Show loading state
  if (loading) {
    return <AuthLoading />
  }

  // Show unauthorized if no user
  if (!user) {
    return <Unauthorized />
  }

  // User is authenticated, render children with auto-logout functionality
  return (
    <>
      {children}
      <LogoutWarningDialog
        open={showWarning}
        onContinue={handleContinueSession}
        onLogout={handleLogoutNow}
        warningMinutes={2}
      />
    </>
  )
}