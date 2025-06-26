// components/real-data-table.tsx
'use client'

import { useDashboardData } from '@/hooks/use-dashboard-data'
import { DataTable } from "@/components/custom/data-table"

export function RealDataTable() {
  const { tableData, loading } = useDashboardData()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-3">Loading transactions...</span>
      </div>
    )
  }

  return <DataTable data={tableData} />
}