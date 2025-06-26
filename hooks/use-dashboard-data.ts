// hooks/use-dashboard-data.ts
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
  livingston: number
  kearny: number
  jerseyCity: number
  union: number
  middletown: number
  passaic: number
}

export function useDashboardData() {
  const [tableData, setTableData] = useState<TransformedTransaction[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      
      console.log('🔍 Fetching transactions for Dashboard...')
      
      const { data: rawData, error } = await supabase
        .from('transactions')
        .select('Date, Amount, "Insurance Company", Office, Status')
        .eq('Status', 'CLEARED')
        .order('Date', { ascending: false })

      if (error) {
        console.error('❌ Error fetching transactions:', error)
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

      // Transform data for chart - group by month and office
      const chartDataMap = new Map<string, ChartData>()
      
      rawData.forEach(row => {
        const date = new Date(row.Date)
        const monthKey = `${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getFullYear()}`
        
        const amount = parseFloat(row.Amount) || 0
        const office = row.Office?.toLowerCase().replace(/\s+/g, '') || 'other'
        
        if (!chartDataMap.has(monthKey)) {
          chartDataMap.set(monthKey, {
            month: monthKey,
            livingston: 0,
            kearny: 0,
            jerseyCity: 0,
            union: 0,
            middletown: 0,
            passaic: 0,
          })
        }
        
        const monthData = chartDataMap.get(monthKey)!
        
        // Map office names to chart properties
        switch (office) {
          case 'livingston':
            monthData.livingston += amount
            break
          case 'kearny':
            monthData.kearny += amount
            break
          case 'jerseycity':
          case 'jersey city':
            monthData.jerseyCity += amount
            break
          case 'union':
            monthData.union += amount
            break
          case 'middletown':
            monthData.middletown += amount
            break
          case 'passaic':
            monthData.passaic += amount
            break  
          default:
            // Handle any other office names if needed
            console.log('Unknown office:', office)
        }
      })

      // Convert map to array and sort by date
      const transformedChartData = Array.from(chartDataMap.values())
        .sort((a, b) => {
          const dateA = new Date(a.month)
          const dateB = new Date(b.month)
          return dateA.getTime() - dateB.getTime()
        })
        .slice(-6) // Get last 6 months

      console.log('✅ Transformed table data:', transformedTableData.length, 'records')
      console.log('✅ Transformed chart data:', transformedChartData)

      setTableData(transformedTableData)
      setChartData(transformedChartData)
      setLoading(false)
    }

    fetchData()
  }, [])

  return { tableData, chartData, loading }
}