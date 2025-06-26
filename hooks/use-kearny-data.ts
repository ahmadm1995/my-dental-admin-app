// hooks/use-kearny-data.ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TransformedTransaction {
  date: string
  amount: number
  insuranceCompany: string
  office: string
  status: string
}

interface ChartData {
  month: string
  revenue: number
}

export function usekearnyData() {
  const [tableData, setTableData] = useState<TransformedTransaction[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [transactionCount, setTransactionCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchkearnyData() {
      const supabase = createClient()
      
      console.log('🔍 Fetching kearny office data...')
      
      // Fetch only kearny office transactions
      const { data: rawData, error } = await supabase
        .from('transactions')
        .select('Date, Amount, "Insurance Company", Office, Status')
        .eq('Status', 'CLEARED')
        .ilike('Office', '%kearny%') // Case-insensitive match for kearny
        .order('Date', { ascending: false })

      if (error) {
        console.error('❌ Error fetching kearny transactions:', error)
        setLoading(false)
        return
      }

      // Transform data for table
      const transformedTableData: TransformedTransaction[] = rawData.map(row => ({
        date: row.Date,
        amount: parseFloat(row.Amount) || 0,
        insuranceCompany: row['Insurance Company'] || '',
        office: row.Office || '',
        status: row.Status || ''
      }))

      // Calculate total revenue and transaction count
      const total = transformedTableData.reduce((sum, transaction) => sum + transaction.amount, 0)
      
      // Transform data for chart - group by month
      const chartDataMap = new Map<string, { month: string, revenue: number, sortDate: Date }>()
      
      rawData.forEach(row => {
        const date = new Date(row.Date)
        const monthKey = `${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getFullYear()}`
        const amount = parseFloat(row.Amount) || 0
        
        // Use the first day of the month for sorting
        const sortDate = new Date(date.getFullYear(), date.getMonth(), 1)
        
        if (!chartDataMap.has(monthKey)) {
          chartDataMap.set(monthKey, { month: monthKey, revenue: 0, sortDate })
        }
        
        const existing = chartDataMap.get(monthKey)!
        existing.revenue += amount
      })

      // Convert map to array and sort by actual date
      const transformedChartData = Array.from(chartDataMap.values())
        .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
        .slice(-6) // Get last 6 months
        .map(({ month, revenue }) => ({ month, revenue })) // Remove sortDate from final output

      console.log('✅ kearny data loaded:', {
        transactions: transformedTableData.length,
        totalRevenue: total,
        chartData: transformedChartData
      })

      setTableData(transformedTableData)
      setChartData(transformedChartData)
      setTotalRevenue(total)
      setTransactionCount(transformedTableData.length)
      setLoading(false)
    }

    fetchkearnyData()
  }, [])

  return { tableData, chartData, totalRevenue, transactionCount, loading }
}