// components/auth/logout-warning-dialog.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface LogoutWarningDialogProps {
  open: boolean
  onContinue: () => void
  onLogout: () => void
  warningMinutes?: number
}

export function LogoutWarningDialog({
  open,
  onContinue,
  onLogout,
  warningMinutes = 2
}: LogoutWarningDialogProps) {
  const [timeLeft, setTimeLeft] = useState(warningMinutes * 60)

  useEffect(() => {
    if (!open) {
      setTimeLeft(warningMinutes * 60)
      return
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [open, onLogout, warningMinutes])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in <strong>{formatTime(timeLeft)}</strong> due to inactivity.
            Click Stay Logged In to continue your session.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onLogout}>
            Logout Now
          </AlertDialogCancel>
          <AlertDialogAction onClick={onContinue}>
            Stay Logged In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}