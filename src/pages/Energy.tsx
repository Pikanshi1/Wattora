
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  CalendarDays,
  ChevronDown,
  Clock3,
  Home,
  Leaf,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Settings,
  Sun,
  TrendingUp,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { predictEnergy } from '../services/api'
import { useActiveSiteData } from '../hooks/useActiveSiteData'

const forecastHours = [6, 8, 10, 12, 14, 16, 18, 20, 22]

const formatHour = (hour: number) => {
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Solar forecast', icon: Sun, href: '/solar' },
  { label: 'Energy demand', icon: Activity, href: '/energy' },
  { label: 'Optimization', icon: Lightbulb, href: '/optimization' },
  { label: 'Devices', icon: BatteryCharging, href: '/devices' },
]

type DemandPoint = {
  time: string
  hour: number
  demand: number
}

function toKilowatts(value: number, unit: string): number {
  const normalizedUnit = unit.trim().toLowerCase().replace(/\s+/g, '')

  if (['w', 'watt', 'watts'].includes(normalizedUnit)) {
    return Math.max(0, value / 1000)
  }

  if (['kw', 'kilowatt', 'kilowatts'].includes(normalizedUnit)) {
    return Math.max(0, value)
  }

  throw new Error(
    `The energy API returned an unsupported demand unit: "${unit}". Expected W or kW.`,
  )
}

function MetricCard({
  title,
  value,
  unit,
  note,
  icon: Icon,
}: {
  title: string
  value: string
  unit: string
  note: string
  icon: typeof Zap
}) {
  return (
    <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#718276]">{title}</p>

        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
          <Icon size={20} />
        </span>
      </div>

      <p className="mt-4 text-3xl font-semibold tracking-tight">
        {value}{' '}
        <span className="text-sm font-normal text-[#718276]">{unit}</span>
      </p>

      <p className="mt-2 text-xs text-[#94A397]">{note}</p>
    </div>
  )
}

export default function Energy() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [period, setPeriod] = useState('Today')
  const [chartData, setChartData] = useState<DemandPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  const {
    activeSite,
    loading: siteLoading,
    error: siteError,
  } = useActiveSiteData()

  useEffect(() => {
    let cancelled = false

    async function loadForecast() {
      setLoading(true)
      setApiError('')
      setChartData([])

      const targetDate = new Date()

      if (period === 'Tomorrow') {
        targetDate.setDate(targetDate.getDate() + 1)
      }

      const dayOfYear =
        Math.floor(
          (
            Date.UTC(
              targetDate.getFullYear(),
              targetDate.getMonth(),
              targetDate.getDate(),
            ) -
            Date.UTC(targetDate.getFullYear(), 0, 0)
          ) / 86400000,
        )

      // JavaScript uses Sunday = 0. Convert to Monday = 0.
      const dayOfWeek = (targetDate.getDay() + 6) % 7

      const isWeekend =
        targetDate.getDay() === 0 || targetDate.getDay() === 6 ? 1 : 0

      try {
        const predictions = await Promise.all(
          forecastHours.map(async (hour): Promise<DemandPoint> => {
            const result = await predictEnergy({
              hour,
              day_of_week: dayOfWeek,
              day_of_year: dayOfYear,
              month: targetDate.getMonth() + 1,
              is_weekend: isWeekend,

              // Illustrative lag values, not live household meter readings.
              lag_1h: 1.0,
              lag_24h: 1.2,
              lag_168h: 1.1,
            })

            return {
              time: formatHour(hour),
              hour,
              demand: toKilowatts(
                result.predicted_demand,
                result.unit,
              ),
            }
          }),
        )

        if (!cancelled) {
          setChartData(predictions)
        }
      } catch (error) {
        if (!cancelled) {
          setApiError(
            error instanceof Error
              ? error.message
              : 'Unable to load the demand forecast.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadForecast()

    return () => {
      cancelled = true
    }
  }, [period])

  const peak = chartData.length
    ? chartData.reduce(
        (highest, point) =>
          point.demand > highest.demand ? point : highest,
        chartData[0],
      )
    : { time: '—', hour: 0, demand: 0 }

  const average = chartData.length
    ? chartData.reduce((total, point) => total + point.demand, 0) /
      chartData.length
    : 0

  // Approximate energy by integrating the sampled demand curve.
  const estimatedDailyUsage =
    chartData.length > 1
      ? chartData.slice(1).reduce(
          (total, point, index) =>
            total +
            (
              (point.demand + chartData[index].demand) / 2
            ) *
              (point.hour - chartData[index].hour),
          0,
        )
      : 0

  const forecastStatus = loading
    ? 'Loading'
    : apiError
      ? 'Unavailable'
      : 'Connected'

  const statusNote = loading
    ? 'Requesting model predictions'
    : apiError
      ? 'Backend request failed'
      : 'FastAPI model returned predictions'

  return (
    <div className="min-h-screen bg-[#F4F8F3] text-[#244A35]">
      {mobileOpen && (
        <button
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-[#193326]/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#E4ECE1] bg-white px-5 py-6 transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Link to="/" className="mb-10 flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#43865A] text-white">
            <Leaf size={22} />
          </span>

          <span className="text-2xl font-bold tracking-tight">
            wattora<span className="text-[#43865A]">.</span>
          </span>
        </Link>

        <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#94A397]">
          Workspace
        </p>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = item.href === '/energy'

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? 'bg-[#E7F1E5] text-[#315A40]'
                    : 'text-[#718276] hover:bg-[#F4F8F3] hover:text-[#244A35]'
                }`}
              >
                <Icon size={19} />
                {item.label}

                {active && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-[#43865A]" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="mt-8 border-t border-[#E8EEE6] pt-6">
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#718276] hover:bg-[#F4F8F3]"
          >
            <Settings size={19} />
            Profile &amp; settings
          </Link>
        </div>

        <div className="mt-auto rounded-2xl bg-[#F4F8F3] p-4">
          <Leaf size={22} className="text-[#43865A]" />

          <p className="mt-3 text-sm font-semibold">
            Understand your usage.
          </p>

          <p className="mt-1 text-xs leading-5 text-[#718276]">
            Better demand forecasts help you plan energy use more efficiently.
          </p>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#E4ECE1] bg-white/95 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-2 text-[#315A40] hover:bg-[#F4F8F3] lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div>
              <h1 className="text-lg font-semibold sm:text-xl">
                Energy demand
              </h1>

              <p className="hidden text-xs text-[#718276] sm:block">
                Understand and anticipate your electricity use
              </p>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE6D9] px-3 py-2.5 text-sm font-medium text-[#315A40] hover:bg-[#F4F8F3]"
          >
            <Home size={16} />
            <span className="hidden sm:inline">Overview</span>
          </Link>
        </header>

        <main className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-8">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-[#43865A]">
                ENERGY INTELLIGENCE
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Know your energy rhythm.
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[#718276]">
                See when electricity demand rises, anticipate busy periods,
                and find opportunities to align usage with solar generation.
              </p>

              <p className="mt-2 text-xs text-[#718276]">
                {siteLoading
                  ? 'Loading selected site…'
                  : activeSite
                    ? `Active site: ${activeSite.name}`
                    : siteError || 'No active site selected'}
              </p>
            </div>

            <label className="flex w-fit items-center gap-2 rounded-xl border border-[#DCE6D9] bg-white px-3 py-2.5 text-sm">
              <CalendarDays size={17} className="text-[#43865A]" />

              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className="bg-transparent text-[#315A40] outline-none"
                aria-label="Demand forecast period"
              >
                <option>Today</option>
                <option>Tomorrow</option>
              </select>

              <ChevronDown size={14} className="text-[#718276]" />
            </label>
          </section>

          {apiError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <p className="font-semibold">Demand forecast unavailable</p>
              <p className="mt-1">{apiError}</p>
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Estimated daily usage"
              value={loading ? '—' : estimatedDailyUsage.toFixed(1)}
              unit="kWh*"
              note="Approximation from forecast samples"
              icon={Zap}
            />

            <MetricCard
              title="Peak demand"
              value={loading ? '—' : peak.demand.toFixed(2)}
              unit="kW"
              note={`Highest sample point: ${peak.time}`}
              icon={TrendingUp}
            />

            <MetricCard
              title="Average sample demand"
              value={loading ? '—' : average.toFixed(2)}
              unit="kW"
              note="Average of displayed predictions"
              icon={Activity}
            />

            <MetricCard
              title="Forecast status"
              value={forecastStatus}
              unit=""
              note={statusNote}
              icon={Clock3}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.7fr)]">
            <div className="min-w-0 rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-6">
              <div>
                <h3 className="text-base font-semibold">
                  Hourly demand forecast
                </h3>

                <p className="mt-1 text-sm text-[#718276]">
                  Model predictions using illustrative load-history inputs
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs text-[#718276]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#43865A]" />
                Predicted demand
              </div>

              <div className="mt-4 h-[300px] w-full">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-sm text-[#718276]">
                    Requesting hourly predictions from the Wattora API…
                  </div>
                ) : apiError ? (
                  <div className="flex h-full items-center justify-center text-center text-sm text-[#718276]">
                    Forecast data could not be loaded.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="demandForecastFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#43865A"
                            stopOpacity={0.24}
                          />
                          <stop
                            offset="100%"
                            stopColor="#43865A"
                            stopOpacity={0.01}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        stroke="#E8EEE6"
                        strokeDasharray="4 4"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="time"
                        tick={{ fill: '#829184', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                      />

                      <YAxis
                        tick={{ fill: '#829184', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${value} kW`}
                      />

                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #E4ECE1',
                          fontSize: 12,
                        }}
                        formatter={(value) => [
                          `${Number(value).toFixed(2)} kW`,
                          'Predicted demand',
                        ]}
                      />

                      <Area
                        type="monotone"
                        dataKey="demand"
                        stroke="#43865A"
                        strokeWidth={2.5}
                        fill="url(#demandForecastFill)"
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              <p className="mt-3 text-xs leading-5 text-[#94A397]">
                *The energy figure is estimated from the sampled curve.
                The model's lag inputs are illustrative values, not live
                household meter readings.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-6">
              <h3 className="text-base font-semibold">Peak demand window</h3>

              <p className="mt-1 text-sm text-[#718276]">
                Based on the selected model forecast
              </p>

              <div className="mt-6 rounded-2xl bg-[#F4F8F3] p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#43865A]">
                  <Clock3 size={22} />
                </div>

                <p className="mt-4 text-2xl font-semibold">
                  {loading ? '—' : peak.time}
                </p>

                <p className="mt-1 text-sm text-[#718276]">
                  {loading
                    ? 'Loading prediction…'
                    : apiError
                      ? 'Forecast unavailable'
                      : `Predicted peak: ${peak.demand.toFixed(2)} kW`}
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                    <Sun size={18} />
                  </span>

                  <div>
                    <p className="text-sm font-medium">
                      Compare with solar output
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#718276]">
                      Check whether flexible demand can shift to periods of
                      stronger solar generation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                    <BatteryCharging size={18} />
                  </span>

                  <div>
                    <p className="text-sm font-medium">
                      Review flexible loads
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#718276]">
                      Consider appliance schedules and battery limits before
                      changing when energy is used.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#DCE6D9] bg-[#E7F1E5] p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#43865A]">
                <Lightbulb size={22} />
              </div>

              <h3 className="mt-4 font-semibold">
                Demand-aware recommendations
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#526F5A]">
                Wattora can combine demand forecasts, solar availability,
                electricity tariffs, and device constraints to recommend
                practical scheduling changes.
              </p>

              <Link
                to="/optimization"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#36734B] hover:text-[#244A35]"
              >
                Explore optimization <ArrowRight size={16} />
              </Link>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4F8F3] text-[#43865A]">
                <Activity size={22} />
              </div>

              <h3 className="mt-4 font-semibold">
                Improve forecast accuracy
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#718276]">
                More accurate demand forecasts need historical load readings,
                timestamps, and relevant calendar or weather features.
                Live readings can replace the example lag inputs when
                available.
              </p>

              <Link
                to="/solar"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#43865A] hover:text-[#244A35]"
              >
                Review solar forecast <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          <footer className="flex flex-col justify-between gap-2 border-t border-[#E1EAE0] py-5 text-xs text-[#94A397] sm:flex-row">
            <p>© 2026 Wattora · Smarter energy, naturally.</p>

            <Link
              to="/"
              className="inline-flex items-center gap-1 hover:text-[#43865A]"
            >
              Home <ArrowUpRight size={13} />
            </Link>
          </footer>
        </main>
      </div>
    </div>
  )
}
