
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  CloudSun,
  House,
  Leaf,
  MapPin,
  Settings,
  Sun,
  TrendingUp,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  getSites,
  getDevices,
  optimizeEnergy,
  predictEnergy,
  predictSolar,
} from '../services/api'

import type { Device, Site } from '../services/api'

import { chooseActiveSite } from '../services/activeSite'

type Period = 'today' | 'tomorrow'

type HourlyPoint = {
  hour: number
  time: string
  solar: number
  demand: number
  solarWatts: number
  optimizerStatus?: string
  recommendation?: string
}

const forecastHours = [6, 8, 10, 12, 14, 16, 18, 20, 22]

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: House },
  { label: 'Solar', href: '/solar', icon: Sun },
  { label: 'Energy demand', href: '/energy', icon: Activity },
  { label: 'Optimization', href: '/optimization', icon: Zap },
]

// Demonstration values only; these are not historical API readings.
const weeklyData = [
  { day: 'Mon', solar: 12.1, demand: 10.4 },
  { day: 'Tue', solar: 13.4, demand: 11.2 },
  { day: 'Wed', solar: 11.8, demand: 12.1 },
  { day: 'Thu', solar: 14.2, demand: 10.9 },
  { day: 'Fri', solar: 13.1, demand: 11.8 },
  { day: 'Sat', solar: 15.0, demand: 12.4 },
  { day: 'Sun', solar: 12.8, demand: 10.7 },
]

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / 86400000)
}

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12} ${suffix}`
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

function toKilowatts(value: number, unit?: string): number {
  const normalized = (unit ?? '').trim().toLowerCase().replace(/\s/g, '')

  if (
    normalized === 'w' ||
    (normalized.includes('watt') && !normalized.includes('kw'))
  ) {
    return value / 1000
  }

  return value
}

function toWatts(value: number, unit?: string): number {
  const normalized = (unit ?? '').trim().toLowerCase().replace(/\s/g, '')

  if (normalized === 'kw' || normalized.includes('kilowatt')) {
    return value * 1000
  }

  return value
}

function integrateHourlyValues(
  points: HourlyPoint[],
  key: 'solar' | 'demand',
): number {
  if (points.length < 2) return 0

  let total = 0

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const intervalHours = current.hour - previous.hour

    total += ((previous[key] + current[key]) / 2) * intervalHours
  }

  return total
}

function makeSolarInput(hour: number, date: Date, site: Site) {
  const daylightFactor =
    hour >= 6 && hour <= 18
      ? Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI))
      : 0

  return {
    // Keep this within the plant IDs supported by the trained model.
    // A site database ID is not necessarily a model plant ID.
    plant_id: 1,
    site_id: site.id,
    ambient_temperature: 25,
    module_temperature: 30,
    irradiation: Number((daylightFactor * 0.8).toFixed(3)),
    hour,
    day_of_year: getDayOfYear(date),
    month: date.getMonth() + 1,
  }
}

function makeEnergyInput(hour: number, date: Date, site: Site) {
  return {
    site_id: site.id,
    hour,
    day_of_week: date.getDay(),
    day_of_year: getDayOfYear(date),
    month: date.getMonth() + 1,
    is_weekend: date.getDay() === 0 || date.getDay() === 6 ? 1 : 0,

  }
}

export default function Dashboard() {
  const [showNotifications, setShowNotifications] = useState(false)
  const [period, setPeriod] = useState<Period>('today')
  const [hourlyData, setHourlyData] = useState<HourlyPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [optimizerMessage, setOptimizerMessage] = useState('')
  const [optimizerStatus, setOptimizerStatus] = useState('')

  const [activeSite, setActiveSite] = useState<Site | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [siteLoading, setSiteLoading] = useState(true)
  const [siteError, setSiteError] = useState('')

  const forecastDate = useMemo(() => {
    const date = new Date()
    if (period === 'tomorrow') date.setDate(date.getDate() + 1)
    return date
  }, [period])

  // Load the default/selected site and its devices.
  useEffect(() => {
    let cancelled = false
    let requestVersion = 0

    async function loadSiteContext() {
      const version = ++requestVersion

      setSiteLoading(true)
      setSiteError('')

      try {
        const sites = await getSites()
        if (cancelled || version !== requestVersion) return

        const selectedSite = chooseActiveSite(sites)

        if (!selectedSite) {
          setActiveSite(null)
          setDevices([])
          setSiteError(
            'No sites found. Add a site to view its energy workspace.',
          )
          return
        }

        setActiveSite(selectedSite)

        const siteDevices = await getDevices(selectedSite.id)
        if (cancelled || version !== requestVersion) return

        setDevices(siteDevices)
      } catch (error) {
        if (cancelled || version !== requestVersion) return

        setSiteError(
          error instanceof Error
            ? error.message
            : 'Unable to load site and device information.',
        )
        setDevices([])
      } finally {
        if (!cancelled && version === requestVersion) {
          setSiteLoading(false)
        }
      }
    }

    const handleActiveSiteChanged = () => {
      void loadSiteContext()
    }

    void loadSiteContext()

    window.addEventListener(
      'wattora:active-site-changed',
      handleActiveSiteChanged,
    )

    return () => {
      cancelled = true
      window.removeEventListener(
        'wattora:active-site-changed',
        handleActiveSiteChanged,
      )
    }
  }, [])

  // Request hourly model predictions and optimizer results.
  useEffect(() => {
    let cancelled = false

    async function loadPredictions(site: Site) {
      setLoading(true)
      setApiError('')
      setOptimizerMessage('')
      setOptimizerStatus('')
      setHourlyData([])

      try {
        const predictions = await Promise.all(
          forecastHours.map(async (hour) => {
            const [solarResult, energyResult] = await Promise.all([
              predictSolar(makeSolarInput(hour, forecastDate, site)),
              predictEnergy(makeEnergyInput(hour, forecastDate, site)),
            ])

            const solarKw = toKilowatts(
              solarResult.predicted_power,
              solarResult.unit,
            )

            const demandKw = toKilowatts(
              energyResult.predicted_demand,
              energyResult.unit,
            )

            let status: string | undefined
            let recommendation: string | undefined

            try {
              const optimization = await optimizeEnergy(
                site.id,
                toWatts(solarKw, 'kW'),
              )

              status = optimization.status
              recommendation = optimization.recommendation
            } catch {
              // Keep the solar and demand charts available if optimization fails.
            }

            return {
              hour,
              time: formatHour(hour),
              solar: Math.max(0, solarKw),
              demand: Math.max(0, demandKw),
              solarWatts: toWatts(solarKw, 'kW'),
              optimizerStatus: status,
              recommendation,
            } satisfies HourlyPoint
          }),
        )

        if (cancelled) return

        setHourlyData(predictions)

        const preferredPoint =
          predictions.find((point) => point.hour === 12) ??
          predictions[Math.floor(predictions.length / 2)]

        if (preferredPoint) {
          setOptimizerStatus(preferredPoint.optimizerStatus ?? '')
          setOptimizerMessage(preferredPoint.recommendation ?? '')
        }
      } catch (error) {
        if (cancelled) return

        setApiError(
          error instanceof Error
            ? error.message
            : 'Unable to load predictions from the Wattora API.',
        )
        setHourlyData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (siteLoading) return

    if (!activeSite) {
      setLoading(false)
      setHourlyData([])
      setApiError('Select or create a site before loading predictions.')
      return
    }

    void loadPredictions(activeSite)

    return () => {
      cancelled = true
    }
  }, [forecastDate, activeSite, siteLoading])

  const solarTotal = useMemo(
    () => integrateHourlyValues(hourlyData, 'solar'),
    [hourlyData],
  )

  const demandTotal = useMemo(
    () => integrateHourlyValues(hourlyData, 'demand'),
    [hourlyData],
  )

  const surplusTotal = solarTotal - demandTotal

  const latestSolar = hourlyData.reduce(
    (maximum, point) => Math.max(maximum, point.solar),
    0,
  )

  const enabledDevices = devices.filter((device) => device.enabled)

  const enabledConnectedLoadKw =
    enabledDevices.reduce((total, device) => total + device.power, 0) / 1000

  const recentActivity = [
    {
      title: 'Solar prediction',
      detail: loading
        ? 'Loading solar forecast from the backend.'
        : apiError
          ? 'Solar prediction could not be loaded.'
          : 'Hourly solar predictions received from the API.',
      time: period === 'today' ? 'Today' : 'Tomorrow',
      icon: Sun,
    },
    {
      title: 'Energy demand prediction',
      detail: loading
        ? 'Loading household demand predictions.'
        : apiError
          ? 'Energy demand prediction could not be loaded.'
          : 'Predicted household demand is available in the chart.',
      time: period === 'today' ? 'Today' : 'Tomorrow',
      icon: Activity,
    },
    {
      title: 'Energy balance',
      detail:
        optimizerMessage ||
        (loading
          ? 'Waiting for optimizer analysis.'
          : 'Optimizer recommendation is unavailable.'),
      time: 'Latest analysis',
      icon: BatteryCharging,
    },
  ]

  return (
    <div className="min-h-screen bg-[#F4F8F3] text-[#244A35]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-[#E4ECE1] bg-white px-5 py-6 lg:flex">
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
            const active = item.href === '/dashboard'

            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? 'bg-[#E7F1E5] text-[#315A40]'
                    : 'text-[#718276] hover:bg-[#F4F8F3] hover:text-[#244A35]'
                }`}
              >
                <Icon size={19} />
                {item.label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#43865A]" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="mt-8 border-t border-[#E8EEE6] pt-6">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#94A397]">
            Manage
          </p>
          <Link
            to="/sites"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#718276] hover:bg-[#F4F8F3]"
          >
            <MapPin size={19} />
            Sites &amp; locations
          </Link>
          <Link
            to="/profile"
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#718276] hover:bg-[#F4F8F3]"
          >
            <House size={19} />
            Profile
          </Link>
          <Link
            to="/settings"
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#718276] hover:bg-[#F4F8F3]"
          >
            <Settings size={19} />
            Settings
          </Link>
        </div>

        <div className="mt-auto rounded-2xl bg-[#F4F8F3] p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
            <Leaf size={20} />
          </span>
          <p className="mt-3 text-sm font-semibold">Energy with purpose</p>
          <p className="mt-1 text-xs leading-5 text-[#718276]">
            Understand your energy patterns and make informed decisions.
          </p>
          <Link
            to="/optimization"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#43865A]"
          >
            Explore optimization <ArrowRight size={13} />
          </Link>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#E4ECE1] bg-white/95 px-4 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs text-[#718276]">Your energy workspace</p>
            <h1 className="text-lg font-semibold sm:text-xl">Overview</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/sites"
              className="hidden items-center gap-2 rounded-xl border border-[#DCE6D9] px-3 py-2.5 text-sm text-[#526F5A] transition hover:bg-[#F4F8F3] sm:flex"
            >
              <House size={16} />
              {activeSite?.name ?? 'My Home'}
              <ChevronDown size={14} />
            </Link>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Toggle activity panel"
                aria-expanded={showNotifications}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE6D9] text-[#526F5A] hover:bg-[#F4F8F3]"
              >
                <Bell size={19} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#43865A]" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 z-30 w-72 rounded-2xl border border-[#E4ECE1] bg-white p-4 shadow-lg">
                  <h3 className="font-semibold">Recent activity</h3>
                  <p className="mt-1 text-xs leading-5 text-[#718276]">
                    Status of the latest prediction requests.
                  </p>
                  <Link
                    to="/solar"
                    onClick={() => setShowNotifications(false)}
                    className="mt-3 flex items-center justify-between rounded-xl bg-[#F4F8F3] p-3 text-sm font-medium hover:bg-[#E7F1E5]"
                  >
                    View solar forecast <ArrowRight size={15} />
                  </Link>
                </div>
              )}
            </div>

            <Link
              to="/profile"
              aria-label="Open profile"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E5] text-sm font-semibold text-[#315A40]"
            >
              W
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-8">
          <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium text-[#43865A]">
                YOUR ENERGY AT A GLANCE
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Good to see you.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718276]">
                View solar generation and household demand using predictions
                from the Wattora backend.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <div className="inline-flex items-center gap-2 rounded-xl border border-[#DCE6D9] bg-white px-3 py-2 text-[#526F5A]">
                  <MapPin size={16} className="text-[#43865A]" />
                  <span className="font-medium">
                    {siteLoading
                      ? 'Loading site...'
                      : activeSite?.name ?? 'No site selected'}
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl border border-[#DCE6D9] bg-white px-3 py-2 text-[#526F5A]">
                  <House size={16} className="text-[#43865A]" />
                  {enabledDevices.length} enabled devices
                </div>

                {activeSite && (
                  <span className="text-xs text-[#718276]">
                    Solar capacity: {activeSite.solar_capacity} kW
                  </span>
                )}
              </div>

              {siteError && (
                <p role="alert" className="mt-2 text-xs text-red-600">
                  {siteError}
                </p>
              )}

              {!siteLoading && !siteError && (
                <p className="mt-1 text-xs text-[#94A397]">
                  Enabled devices' connected load:{' '}
                  {enabledConnectedLoadKw.toFixed(2)} kW (estimated from device
                  ratings).
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 self-start rounded-xl border border-[#DCE6D9] bg-white px-3 py-2.5 text-xs font-medium text-[#526F5A] md:self-auto">
              <CalendarDays size={16} className="text-[#43865A]" />
              {loading
                ? 'Loading predictions'
                : apiError
                  ? 'API unavailable'
                  : formatDateLabel(forecastDate)}
            </div>
          </section>

          {apiError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p className="font-semibold">
                Could not load dashboard predictions
              </p>
              <p className="mt-1">{apiError}</p>
              <p className="mt-2 text-xs">
                Check that FastAPI is running at http://127.0.0.1:8000 and that
                the frontend can reach it.
              </p>
            </div>
          )}

          <section className="relative overflow-hidden rounded-2xl bg-[#315A40] p-6 text-white sm:p-8">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-[#E7F1E5]">
                <CloudSun size={15} />
                Solar meets smarter energy
              </div>
              <h3 className="mt-5 text-2xl font-semibold leading-tight sm:text-3xl">
                Make every unit of energy count.
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
                Explore predicted solar generation, household demand, and the
                energy-balance recommendation returned by your backend.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/optimization"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#315A40] transition hover:bg-[#E7F1E5]"
                >
                  Explore energy plan <ArrowRight size={16} />
                </Link>
                <Link
                  to="/solar"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  View solar forecast
                </Link>
              </div>
            </div>
            <div className="pointer-events-none absolute -right-10 -top-16 hidden h-80 w-80 items-center justify-center rounded-full border border-white/10 md:flex">
              <div className="flex h-56 w-56 items-center justify-center rounded-full border border-white/10">
                <div className="flex h-36 w-36 items-center justify-center rounded-full bg-white/10">
                  <Sun
                    size={64}
                    strokeWidth={1.2}
                    className="text-[#D1E4CF]"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#718276]">
                  Solar generation
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <Sun size={19} />
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-2">
                <p className="text-3xl font-semibold">
                  {loading ? '—' : solarTotal.toFixed(2)}{' '}
                  <span className="text-base font-medium text-[#718276]">
                    kWh
                  </span>
                </p>
                <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-[#43865A]">
                  <ArrowUpRight size={14} /> Model
                </span>
              </div>
              <p className="mt-2 text-xs text-[#94A397]">
                Approximate total across sampled forecast intervals
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#718276]">Energy demand</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F4EF] text-[#526F5A]">
                  <Activity size={19} />
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-2">
                <p className="text-3xl font-semibold">
                  {loading ? '—' : demandTotal.toFixed(2)}{' '}
                  <span className="text-base font-medium text-[#718276]">
                    kWh
                  </span>
                </p>
                <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-[#526F5A]">
                  <ArrowDownRight size={14} /> Model
                </span>
              </div>
              <p className="mt-2 text-xs text-[#94A397]">
                Approximate total across sampled forecast intervals
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#718276]">Solar surplus</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <BatteryCharging size={19} />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-semibold">
                  {loading ? '—' : surplusTotal.toFixed(2)}{' '}
                  <span className="text-base font-medium text-[#718276]">
                    kWh
                  </span>
                </p>
              </div>
              <p className="mt-2 text-xs text-[#94A397]">
                Estimated generation minus demand; negative means a shortfall
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#718276]">Potential savings</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <TrendingUp size={19} />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-semibold">
                  —{' '}
                  <span className="text-base font-medium text-[#718276]">
                    / day
                  </span>
                </p>
              </div>
              <p className="mt-2 text-xs text-[#94A397]">
                Not available: the current API does not calculate financial
                savings
              </p>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
            <div className="min-w-0 rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-semibold">
                    Solar generation vs demand
                  </h3>
                  <p className="mt-1 text-xs text-[#718276]">
                    Predicted hourly power · kW
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPeriod('today')}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      period === 'today'
                        ? 'bg-[#43865A] text-white'
                        : 'border border-[#DCE6D9] text-[#526F5A] hover:bg-[#F4F8F3]'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setPeriod('tomorrow')}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      period === 'tomorrow'
                        ? 'bg-[#43865A] text-white'
                        : 'border border-[#DCE6D9] text-[#526F5A] hover:bg-[#F4F8F3]'
                    }`}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>

              <div className="mt-6 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={hourlyData}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="solarFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#43865A"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#43865A"
                          stopOpacity={0.01}
                        />
                      </linearGradient>
                      <linearGradient
                        id="demandFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#A5B9A2"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#A5B9A2"
                          stopOpacity={0.01}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="#EAF0E8"
                      strokeDasharray="4 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: '#718276', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#718276', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #E4ECE1',
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="solar"
                      name="Solar generation"
                      stroke="#43865A"
                      fill="url(#solarFill)"
                      strokeWidth={2.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="demand"
                      name="Energy demand"
                      stroke="#91A58F"
                      fill="url(#demandFill)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {loading && (
                <p className="mt-3 text-xs text-[#718276]">
                  Loading hourly predictions...
                </p>
              )}

              {!loading && !apiError && hourlyData.length === 0 && (
                <p className="mt-3 text-xs text-[#718276]">
                  No prediction data was returned.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Energy outlook</h3>
                  <p className="mt-1 text-xs text-[#718276]">
                    Backend prediction summary
                  </p>
                </div>
                <CloudSun size={22} className="text-[#43865A]" />
              </div>

              <div className="mt-6 rounded-xl bg-[#F4F8F3] p-4">
                <div className="flex items-center gap-2">
                  <Sun size={17} className="text-[#43865A]" />
                  <p className="text-sm font-medium">Solar conditions</p>
                </div>
                <p className="mt-2 text-lg font-semibold">
                  {loading
                    ? 'Loading predictions...'
                    : apiError
                      ? 'Unavailable'
                      : latestSolar > 0
                        ? 'Solar generation predicted'
                        : 'Low or no generation predicted'}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#718276]">
                  Based on model output. Weather inputs are illustrative, not
                  live weather readings.
                </p>
              </div>

              <div className="mt-3 rounded-xl border border-[#E4ECE1] p-4">
                <div className="flex items-center gap-2">
                  <Clock size={17} className="text-[#43865A]" />
                  <p className="text-sm font-medium">Energy balance</p>
                </div>
                <p className="mt-2 text-lg font-semibold">
                  {loading
                    ? 'Calculating...'
                    : apiError
                      ? 'Unavailable'
                      : surplusTotal >= 0
                        ? `${surplusTotal.toFixed(2)} kWh estimated surplus`
                        : `${Math.abs(surplusTotal).toFixed(2)} kWh estimated shortfall`}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#718276]">
                  {optimizerMessage ||
                    'The optimizer recommendation will appear here when available.'}
                </p>
              </div>

              {optimizerStatus && (
                <div className="mt-3 rounded-xl bg-[#F4F8F3] p-3 text-xs text-[#526F5A]">
                  <span className="font-semibold">Optimizer status: </span>
                  {optimizerStatus.replaceAll('_', ' ')}
                </div>
              )}

              <Link
                to="/energy"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#DCE6D9] px-4 py-3 text-sm font-semibold text-[#315A40] transition hover:bg-[#F4F8F3]"
              >
                Explore energy demand <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="min-w-0 rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Weekly energy pattern</h3>
                  <p className="mt-1 text-xs text-[#718276]">
                    Illustrative daily totals · kWh
                  </p>
                </div>
                <span className="rounded-lg bg-[#F4F8F3] px-3 py-1.5 text-xs font-medium text-[#526F5A]">
                  Demo data
                </span>
              </div>

              <div className="mt-6 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={weeklyData}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke="#EAF0E8"
                      strokeDasharray="4 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#718276', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#718276', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #E4ECE1',
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="solar"
                      name="Solar generation"
                      stroke="#43865A"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="demand"
                      name="Energy demand"
                      stroke="#A0B29C"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-[#94A397]">
                Connect historical prediction records to replace this
                illustrative chart.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Recent activity</h3>
                <span className="rounded-lg bg-[#F4F8F3] px-2.5 py-1 text-xs text-[#718276]">
                  API status
                </span>
              </div>

              <div className="mt-5 space-y-5">
                {recentActivity.map((item, index) => {
                  const Icon = item.icon

                  return (
                    <div key={item.title} className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                        <Icon size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-[#718276]">
                          {item.detail}
                        </p>
                        <p className="mt-1 text-[11px] text-[#94A397]">
                          {item.time}
                        </p>
                      </div>
                      {index === 0 && !loading && !apiError && (
                        <CheckCircle2
                          size={17}
                          className="mt-1 shrink-0 text-[#43865A]"
                        />
                      )}
                    </div>
                  )
                })}
              </div>

              <Link
                to="/settings"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#43865A] hover:text-[#244A35]"
              >
                Configure preferences <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-[#DCE6D9] bg-[#E7F1E5] p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#43865A]">
                  <Zap size={22} />
                </span>
                <div>
                  <h3 className="font-semibold">
                    Ready to plan your energy use?
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#526F5A]">
                    Open the optimization page to review the backend energy
                    balance and its recommendation.
                  </p>
                </div>
              </div>
              <Link
                to="/optimization"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#36734B]"
              >
                Open optimization <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          <footer className="flex flex-col justify-between gap-2 border-t border-[#E1EAE0] py-5 text-xs text-[#94A397] sm:flex-row">
            <p>© 2026 Wattora · Smarter energy, naturally.</p>
            <Link
              to="/profile"
              className="inline-flex items-center gap-1 hover:text-[#43865A]"
            >
              Manage profile <ArrowRight size={13} />
            </Link>
          </footer>
        </main>
      </div>
    </div>
  )
}
