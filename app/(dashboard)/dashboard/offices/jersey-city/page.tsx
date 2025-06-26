// app/(dashboard)/dashboard/offices/JerseyCity/page.tsx

import { JerseyCityDashboard } from "@/components/offices/jersey-city-dashboard"

export default function JerseyCityPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Jersey City Office</h1>
            <p className="text-muted-foreground">
              Revenue analytics and transaction data for the JerseyCity location
            </p>
          </div>
          <JerseyCityDashboard />
        </div>
      </div>
    </div>
  )
}