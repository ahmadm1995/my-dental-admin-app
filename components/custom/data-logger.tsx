// components/data-logger.tsx
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function DataLogger() {
  useEffect(() => {
    async function fetchAndLogTransactions() {
      const supabase = createClient()
      
      console.log('🔍 Checking user authentication...')
      
      // First check if we're authenticated
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 Current user:', user?.email || 'Not authenticated')
      
      console.log('🔍 Attempting to fetch transactions...')
      
      const { data, error, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .limit(5)
      
      console.log('📊 Query result:', { data, error, count })
      
      if (error) {
        console.error('❌ Error details:', error)
        console.log('🔒 This might be a Row Level Security (RLS) issue')
        return
      }
      
      if (count === 0) {
        console.log('🔒 RLS might be blocking access even though data exists')
        console.log('💡 Check Supabase Dashboard → Authentication → Policies')
      }
    }
    
    fetchAndLogTransactions()
  }, [])

  return null
}