// components/dashboard/dentalBarCharts.tsx
"use client"

import { TrendingUp, TrendingDown } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useDashboardData } from '@/hooks/use-dashboard-data'

const chartConfig = {
  livingston: {
    label: "Livingston",
    color: "#8884d8",
  },
  kearny: {
    label: "Kearny", 
    color: "#82ca9d",
  },
  jerseyCity: {
    label: "Jersey City",
    color: "#ffc658",
  },
  union: {
    label: "Union",
    color: "#ff7c7c",
  },
  middletown: {
    label: "Middletown",
    color: "#8dd1e1",
  },
  passaic: {
    label: "Passaic",
    color: "#d084d0",
  },
} satisfies ChartConfig

export function DentalBarChart() {
  const { chartData, loading } = useDashboardData()

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Revenue by Office Location</CardTitle>
          <CardDescription className="text-sm">Loading chart data...</CardDescription>
        </CardHeader>
        <CardContent className="pb-3 flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  // Calculate trend (simple comparison of last vs first month total revenue)
  const getTotalRevenue = (monthData: any) => 
    monthData.livingston + monthData.kearny + monthData.jerseyCity + monthData.union + monthData.middletown + monthData.passaic

  const trendPercentage = chartData.length >= 2 ? 
    ((getTotalRevenue(chartData[chartData.length - 1]) - getTotalRevenue(chartData[0])) /
     getTotalRevenue(chartData[0])) * 100 : 0

  const isPositiveTrend = trendPercentage >= 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Revenue by Office Location</CardTitle>
        <CardDescription className="text-sm">
          Monthly breakdown - Last {chartData.length} months (Real Data)
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <BarChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              fontSize={11}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="livingston"
              stackId="a"
              fill="var(--color-livingston)"
              radius={[0, 0, 4, 4]} // Bottom bar - rounded bottom corners
            />
            <Bar
              dataKey="kearny"
              stackId="a"
              fill="var(--color-kearny)"
              radius={[0, 0, 0, 0]} // Middle bars - no rounding
            />
            <Bar
              dataKey="jerseyCity"
              stackId="a"
              fill="var(--color-jerseyCity)"
              radius={[0, 0, 0, 0]} // Middle bars - no rounding
            />
            <Bar
              dataKey="union"
              stackId="a"
              fill="var(--color-union)"
              radius={[0, 0, 0, 0]} // Middle bars - no rounding
            />
            <Bar
              dataKey="middletown"
              stackId="a"
              fill="var(--color-middletown)"
              radius={[0, 0, 0, 0]} // Middle bars - no rounding
            />
            <Bar
              dataKey="passaic"
              stackId="a"
              fill="var(--color-passaic)"
              radius={[4, 4, 0, 0]} // Top bar - rounded top corners
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-1 text-xs pt-0">
        <div className="flex gap-1 leading-none font-medium">
          {isPositiveTrend ? 'Trending up' : 'Trending down'} by {Math.abs(trendPercentage).toFixed(1)}% 
          {isPositiveTrend ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        </div>
        <div className="text-muted-foreground leading-none">
          Total revenue by office location based on cleared transactions
        </div>
      </CardFooter>
    </Card>
  )
}