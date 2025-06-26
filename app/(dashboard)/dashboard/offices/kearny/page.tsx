// app/(dashboard)/dashboard/offices/kearny/page.tsx

import { KearnyDashboard } from "@/components/offices/kearny-dashboard"

export default function KearnyPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Kearny Office</h1>
            <p className="text-muted-foreground">
              Revenue analytics and transaction data for the Kearny location
            </p>
          </div>
          <KearnyDashboard />
        </div>
      </div>
    </div>
  )
}