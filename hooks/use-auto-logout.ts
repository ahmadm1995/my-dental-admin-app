// hooks/use-auto-logout.ts
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseAutoLogoutProps {
  timeoutMinutes?: number
  warningMinutes?: number
  onWarning?: () => void
  onLogout?: () => void
}

export function useAutoLogout({
  timeoutMinutes = 10,
  warningMinutes = 2,
  onWarning,
  onLogout
}: UseAutoLogoutProps = {}) {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const warningTimeoutRef = useRef<NodeJS.Timeout>()
  const supabase = createClient()

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    onLogout?.()
  }, [supabase, onLogout])

  const showWarning = useCallback(() => {
    onWarning?.()
  }, [onWarning])

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }

    // Set warning timer (shows warning before logout)
    const warningTime = (timeoutMinutes - warningMinutes) * 60 * 1000
    if (warningTime > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        showWarning()
      }, warningTime)
    }

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      logout()
    }, timeoutMinutes * 60 * 1000)
  }, [timeoutMinutes, warningMinutes, logout, showWarning])

  useEffect(() => {
    // Activity events to track
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ]

    // Add event listeners
    const handleActivity = () => {
      resetTimer()
    }

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Start the timer initially
    resetTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
    }
  }, [resetTimer])

  return {
    resetTimer,
    logout
  }
}