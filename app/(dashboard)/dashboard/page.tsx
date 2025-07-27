// app/(dashboard)/dashboard/page.tsx (simplified from your current)
import { SectionCards } from "@/components/custom/section-cards"
import { DentalBarChart } from "@/components/dashboard/dentalBarCharts"
import { RealDataTable } from "@/components/custom/real-data-table"

export default function DashboardPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2 ">

      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* <SectionCards /> */}
        <div className="px-4 lg:px-6">
          <DentalBarChart />
        </div>
        <RealDataTable />
      </div>
    </div>
  )
}