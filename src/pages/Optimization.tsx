
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BatteryCharging,
  Check,
  ChevronDown,
  Clock3,
  Leaf,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  WashingMachine,
  Zap,
} from 'lucide-react'
import {
  getDevices,
  getSites,
  optimizeEnergy,
  predictSolar,
  setDeviceEnabled,
} from '../services/api'
import type {
  Device,
  Site,
  OptimizationResult,
} from '../services/api'
import {
  chooseActiveSite,
  getActiveSiteId,
} from '../services/activeSite'

const START_OPTIONS = [
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
]

type PlannerDevice = Device & {
  start: string
}

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Solar forecast', icon: Sun, href: '/solar' },
  { label: 'Energy demand', icon: Activity, href: '/energy' },
  { label: 'Optimization', icon: Lightbulb, href: '/optimization' },
  { label: 'Devices', icon: BatteryCharging, href: '/devices' },
]

function getDeviceIcon(device: Device) {
  const name = device.name.toLowerCase()

  if (name.includes('wash') || name.includes('laundry')) {
    return WashingMachine
  }

  if (
    name.includes('battery') ||
    name.includes('charg')
  ) {
    return BatteryCharging
  }

  if (
    name.includes('solar') ||
    name.includes('heater') ||
    device.category === 'Climate'
  ) {
    return Zap
  }

  if (device.category === 'Other') {
    return BatteryCharging
  }

  return Zap
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const difference = date.getTime() - start.getTime()

  return Math.floor(difference / (24 * 60 * 60 * 1000))
}

function solarOutputToWatts(
  value: number,
  unit: string | undefined,
): number {
  const normalizedUnit = (unit ?? '').trim().toLowerCase()

  if (normalizedUnit.includes('kw')) {
    return Math.max(0, value * 1000)
  }

  if (normalizedUnit.includes('w')) {
    return Math.max(0, value)
  }

  // Fallback for models whose response does not specify a unit.
  // The backend's documented solar response should normally include it.
  return Math.max(0, value)
}

function formatPowerWatts(watts: number): string {
  if (watts >= 1000) {
    return `${(watts / 1000).toFixed(2)} kW`
  }

  return `${watts.toFixed(0)} W`
}

function formatDuration(hours: number): string {
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
}

export default function Optimization() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [solarPriority, setSolarPriority] = useState(70)
  const [costPriority, setCostPriority] = useState(30)

  const [activeSite, setActiveSite] = useState<Site | null>(null)
  const [devices, setDevices] = useState<PlannerDevice[]>([])

  const [siteLoading, setSiteLoading] = useState(true)
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [updatingDeviceIds, setUpdatingDeviceIds] = useState<number[]>([])

  const [generated, setGenerated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [siteError, setSiteError] = useState('')
  const [analysis, setAnalysis] = useState<OptimizationResult | null>(null)

 
const loadSiteData = useCallback(async () => {
  try {
    const siteResults = await getSites()
    const selectedSite = chooseActiveSite(siteResults)

    setActiveSite(selectedSite)

    if (!selectedSite) {
      setDevices([])
      setSiteError('No sites found. Add a site before using optimization.')
      return
    }

    // Save the fallback directly, without dispatching another site-change event.
    if (getActiveSiteId() !== selectedSite.id) {
      try {
        localStorage.setItem('wattora.activeSiteId', String(selectedSite.id))
      } catch {
        // Continue even if browser storage is unavailable.
      }
    }

    setDevicesLoading(true)

    const deviceResults = await getDevices(selectedSite.id)

    setDevices(
      deviceResults.map((device, index) => ({
        ...device,
        start: START_OPTIONS[index % START_OPTIONS.length],
      })),
    )
  } catch (error: unknown) {
    setActiveSite(null)
    setDevices([])

    setSiteError(
      error instanceof Error
        ? error.message
        : 'Unable to load sites and devices.',
    )
  } finally {
    setSiteLoading(false)
    setDevicesLoading(false)
  }
}, [])


  useEffect(() => {
    void Promise.resolve().then(loadSiteData)

    const handleSiteChange = () => {
      setAnalysis(null)
      setGenerated(false)
      setSiteLoading(true)
      setDevicesLoading(false)
      setSiteError('')
      setApiError('')
      void loadSiteData()
    }

    window.addEventListener(
      'wattora:active-site-changed',
      handleSiteChange,
    )

    return () => {
      window.removeEventListener(
        'wattora:active-site-changed',
        handleSiteChange,
      )
    }
  }, [loadSiteData])

  const activeDevices = useMemo(
    () => devices.filter((device) => device.enabled),
    [devices],
  )

  // Device power is stored in kW by the backend.
  const activeDemandKw = useMemo(
    () =>
      activeDevices.reduce(
        (total, device) => total + Math.max(0, device.power),
        0,
      ),
    [activeDevices],
  )

  const activeEnergyKwh = useMemo(
    () =>
      activeDevices.reduce(
        (total, device) =>
          total +
          (Math.max(0, device.power) * Math.max(0, device.hours)) / 1000,
        0,
      ),
    [activeDevices],
  )

  async function updateDeviceEnabled(
    device: PlannerDevice,
    enabled: boolean,
  ) {
    setApiError('')
    setAnalysis(null)
    setGenerated(false)
    setUpdatingDeviceIds((current) =>
      current.includes(device.id) ? current : [...current, device.id],
    )

    try {
      const updatedDevice = await setDeviceEnabled(device.id, enabled)

      setDevices((current) =>
        current.map((item) =>
          item.id === device.id
            ? { ...updatedDevice, start: item.start }
            : item,
        ),
      )
    } catch (error: unknown) {
      setApiError(
        error instanceof Error
          ? error.message
          : `Unable to update ${device.name}.`,
      )
    } finally {
      setUpdatingDeviceIds((current) =>
        current.filter((id) => id !== device.id),
      )
    }
  }

  function updatePreferredStart(id: number, start: string) {
    // Preferred start is currently a local UI preference.
    // The backend does not yet persist or optimize appliance schedules.
    setDevices((current) =>
      current.map((device) =>
        device.id === id ? { ...device, start } : device,
      ),
    )

    setGenerated(false)
    setAnalysis(null)
  }

  async function generatePlan() {
    if (!activeSite) {
      setApiError('Select or create a site before analyzing energy.')
      return
    }

    if (activeDevices.length === 0) {
      setApiError('Enable at least one device before analyzing energy.')
      return
    }

    setLoading(true)
    setApiError('')
    setGenerated(false)
    setAnalysis(null)

    try {
      const now = new Date()

      // These weather values are illustrative scenario inputs, not live weather.
      // The site's ID lets the backend apply the selected site's solar capacity.
      const solarResult = await predictSolar({
        plant_id: 1,
        site_id: activeSite.id,
        ambient_temperature: 25,
        module_temperature: 30,
        irradiation: 0.7,
        hour: 12,
        day_of_year: getDayOfYear(now),
        month: now.getMonth() + 1,
      })

      const solarPowerWatts = solarOutputToWatts(
        solarResult.predicted_power,
        solarResult.unit,
      )

      const result = await optimizeEnergy(
        activeSite.id,
        solarPowerWatts,
      )

      setAnalysis(result)
      setGenerated(true)
    } catch (error: unknown) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Unable to analyze the current site's energy balance.",
      )
    } finally {
      setLoading(false)
    }
  }

  const estimatedSavingsLabel = '—'

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
            const active = item.href === '/optimization'

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
            Profile & settings
          </Link>
        </div>

        <div className="mt-auto rounded-2xl bg-[#F4F8F3] p-4">
          <Leaf size={22} className="text-[#43865A]" />
          <p className="mt-3 text-sm font-semibold">
            Use energy thoughtfully.
          </p>
          <p className="mt-1 text-xs leading-5 text-[#718276]">
            Balance solar availability, electricity costs, and your daily needs.
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
                Optimization
              </h1>
              <p className="hidden text-xs text-[#718276] sm:block">
                {siteLoading
                  ? 'Loading your site…'
                  : activeSite
                    ? `Current site: ${activeSite.name}`
                    : 'Connect a site to begin'}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full bg-[#E7F1E5] px-3 py-2 text-xs font-semibold text-[#36734B]">
            <span
              className={`h-2 w-2 rounded-full ${
                loading
                  ? 'bg-[#94A397]'
                  : analysis
                    ? 'bg-[#43865A]'
                    : 'bg-[#94A397]'
              }`}
            />
            {siteLoading
              ? 'Loading site…'
              : loading
                ? 'Analyzing…'
                : analysis
                  ? 'API connected'
                  : 'Ready to analyze'}
          </span>
        </header>

        <main className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-8">
          <section>
            <p className="text-sm font-medium text-[#43865A]">
              SMART ENERGY PLANNING
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Make every watt work harder.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718276]">
              Review the devices at your selected site and analyze their
              connected load against a solar prediction.
            </p>

            {activeSite && (
              <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl border border-[#DCE6D9] bg-white px-4 py-3 text-sm">
                <span className="text-[#718276]">Selected site:</span>
                <span className="font-semibold">{activeSite.name}</span>
                <span className="text-[#94A397]">·</span>
                <span className="text-[#718276]">{activeSite.location}</span>
              </div>
            )}

            {siteError && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700"
              >
                {siteError}
              </p>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#718276]">
                  Estimated savings
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <Zap size={20} />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold">
                {estimatedSavingsLabel}
              </p>
              <p className="mt-2 text-xs text-[#94A397]">
                Not available from the current backend
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#718276]">Included devices</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <BatteryCharging size={20} />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold">
                {activeDevices.length}
                <span className="text-base font-normal text-[#718276]">
                  {' '}/ {devices.length}
                </span>
              </p>
              <p className="mt-2 text-xs text-[#94A397]">
                Devices loaded from the selected site
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#718276]">Planning status</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <ShieldCheck size={20} />
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold">
                {loading
                  ? 'Analyzing…'
                  : generated
                    ? 'Plan analyzed'
                    : 'Not generated'}
              </p>
              <p className="mt-2 text-xs text-[#94A397]">
                {generated
                  ? 'Backend energy balance returned'
                  : 'Choose settings to begin'}
              </p>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <SlidersHorizontal size={21} />
                </span>
                <div>
                  <h3 className="font-semibold">
                    Optimization priorities
                  </h3>
                  <p className="mt-1 text-sm text-[#718276]">
                    Adjust your preferences for this scenario
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-7">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="solarPriority"
                      className="text-sm font-medium"
                    >
                      Prefer solar energy
                    </label>
                    <span className="text-sm font-semibold text-[#43865A]">
                      {solarPriority}%
                    </span>
                  </div>
                  <input
                    id="solarPriority"
                    type="range"
                    min="0"
                    max="100"
                    value={solarPriority}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      setSolarPriority(next)
                      setCostPriority(100 - next)
                      setGenerated(false)
                      setAnalysis(null)
                    }}
                    className="mt-4 w-full accent-[#43865A]"
                  />
                  <div className="mt-2 flex justify-between text-xs text-[#94A397]">
                    <span>Lower priority</span>
                    <span>Higher priority</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="costPriority"
                      className="text-sm font-medium"
                    >
                      Prefer lower electricity cost
                    </label>
                    <span className="text-sm font-semibold text-[#43865A]">
                      {costPriority}%
                    </span>
                  </div>
                  <input
                    id="costPriority"
                    type="range"
                    min="0"
                    max="100"
                    value={costPriority}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      setCostPriority(next)
                      setSolarPriority(100 - next)
                      setGenerated(false)
                      setAnalysis(null)
                    }}
                    className="mt-4 w-full accent-[#43865A]"
                  />
                  <div className="mt-2 flex justify-between text-xs text-[#94A397]">
                    <span>Lower priority</span>
                    <span>Higher priority</span>
                  </div>
                </div>

                <div className="rounded-xl bg-[#F4F8F3] p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb
                      size={19}
                      className="mt-0.5 shrink-0 text-[#43865A]"
                    />
                    <p className="text-xs leading-5 text-[#718276]">
                      The backend analyzes solar generation against connected
                      device demand. The priority sliders are preferences only;
                      they do not currently change the backend calculation.
                      Solar weather inputs are illustrative, not live weather.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-6">
              <h3 className="font-semibold">Flexible appliances</h3>
              <p className="mt-1 text-sm text-[#718276]">
                These devices are loaded from your selected site's Devices API.
              </p>

              {devicesLoading || siteLoading ? (
                <p className="mt-5 rounded-xl bg-[#F4F8F3] p-4 text-sm text-[#718276]">
                  Loading site devices…
                </p>
              ) : devices.length === 0 ? (
                <p className="mt-5 rounded-xl bg-[#F4F8F3] p-4 text-sm leading-6 text-[#718276]">
                  No devices were found for this site. Add devices from the
                  Devices page, then return here.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {devices.map((device) => {
                    const Icon = getDeviceIcon(device)
                    const updating = updatingDeviceIds.includes(device.id)

                    return (
                      <div
                        key={device.id}
                        className={`rounded-xl border p-4 transition ${
                          device.enabled
                            ? 'border-[#DCE6D9] bg-white'
                            : 'border-[#E8EEE6] bg-[#FAFCF9] opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                            <Icon size={20} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">
                              {device.name}
                            </p>
                            <p className="mt-1 text-xs text-[#718276]">
                              {formatPowerWatts(device.power * 1000)} ·{' '}
                              {formatDuration(device.hours)}
                            </p>
                            <p className="mt-1 text-xs text-[#94A397]">
                              {device.flexible
                                ? 'Flexible device'
                                : 'Non-flexible device'}
                            </p>
                          </div>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={device.enabled}
                            aria-label={`Include ${device.name}`}
                            disabled={updating}
                            onClick={() =>
                              void updateDeviceEnabled(
                                device,
                                !device.enabled,
                              )
                            }
                            className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-wait disabled:opacity-50 ${
                              device.enabled
                                ? 'bg-[#43865A]'
                                : 'bg-[#CBD5C8]'
                            }`}
                          >
                            <span
                              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                                device.enabled ? 'left-6' : 'left-1'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <label
                            htmlFor={`start-${device.id}`}
                            className="text-xs text-[#718276]"
                          >
                            Preferred start
                          </label>
                          <div className="flex items-center gap-2 rounded-lg border border-[#E4ECE1] px-2.5 py-2">
                            <Clock3
                              size={14}
                              className="text-[#43865A]"
                            />
                            <select
                              id={`start-${device.id}`}
                              value={device.start}
                              disabled={!device.enabled}
                              onChange={(event) =>
                                updatePreferredStart(
                                  device.id,
                                  event.target.value,
                                )
                              }
                              className="bg-transparent text-xs text-[#315A40] outline-none disabled:opacity-50"
                            >
                              {START_OPTIONS.map((time) => (
                                <option key={time}>{time}</option>
                              ))}
                            </select>
                            <ChevronDown
                              size={13}
                              className="text-[#718276]"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-4 rounded-xl bg-[#F4F8F3] p-3">
                <p className="text-xs leading-5 text-[#718276]">
                  Enabled device load: <strong>{activeDemandKw.toFixed(2)} kW</strong>
                  {' · '}
                  Approximate energy per configured run:{' '}
                  <strong>{activeEnergyKwh.toFixed(2)} kWh</strong>
                </p>
              </div>

              <button
                onClick={() => void generatePlan()}
                disabled={
                  !activeSite ||
                  activeDevices.length === 0 ||
                  loading ||
                  siteLoading ||
                  devicesLoading ||
                  updatingDeviceIds.length > 0
                }
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#36734B] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? 'Analyzing energy balance…'
                  : 'Analyze with backend'}
                <ArrowRight size={17} />
              </button>

              {apiError && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"
                >
                  {apiError}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-semibold">
                  {generated
                    ? 'Energy balance analysis'
                    : 'Selected device plan'}
                </h3>
                <p className="mt-1 text-sm text-[#718276]">
                  {activeSite
                    ? `Site: ${activeSite.name}`
                    : 'Waiting for a selected site'}
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#E7F1E5] px-3 py-1.5 text-xs font-semibold text-[#36734B]">
                <Check size={14} />
                {analysis ? 'Backend analysis' : 'Awaiting analysis'}
              </span>
            </div>

            {activeDevices.length === 0 ? (
              <p className="mt-6 rounded-xl bg-[#F4F8F3] p-4 text-sm text-[#718276]">
                Enable at least one device to analyze the site's energy balance.
              </p>
            ) : analysis ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-[#F4F8F3] p-4">
                  <p className="text-xs text-[#718276]">Solar generation</p>
                  <p className="mt-2 text-xl font-semibold">
                    {analysis.solar_generation_kw.toFixed(2)} kW
                  </p>
                </div>

                <div className="rounded-xl bg-[#F4F8F3] p-4">
                  <p className="text-xs text-[#718276]">Estimated demand</p>
                  <p className="mt-2 text-xl font-semibold">
                    {analysis.demand_kw.toFixed(2)} kW
                  </p>
                </div>

                <div className="rounded-xl bg-[#F4F8F3] p-4">
                  <p className="text-xs text-[#718276]">Solar surplus</p>
                  <p className="mt-2 text-xl font-semibold">
                    {analysis.surplus_kw.toFixed(2)} kW
                  </p>
                </div>

                <div className="rounded-xl bg-[#F4F8F3] p-4">
                  <p className="text-xs text-[#718276]">Grid required</p>
                  <p className="mt-2 text-xl font-semibold">
                    {analysis.grid_required_kw.toFixed(2)} kW
                  </p>
                </div>

                <div className="rounded-xl bg-[#F4F8F3] p-4 sm:col-span-2">
                  <p className="text-xs text-[#718276]">Self-consumption</p>
                  <p className="mt-2 text-xl font-semibold">
                    {analysis.self_consumption_percent.toFixed(1)}%
                  </p>
                </div>

                <div className="rounded-xl bg-[#F4F8F3] p-4 sm:col-span-2">
                  <p className="text-xs text-[#718276]">Status</p>
                  <p className="mt-2 text-xl font-semibold capitalize">
                    {analysis.status.replaceAll('_', ' ')}
                  </p>
                </div>

                <div className="rounded-xl border border-[#DCE6D9] bg-white p-4 sm:col-span-2 lg:col-span-4">
                  <p className="text-xs font-semibold text-[#43865A]">
                    Recommendation
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#315A40]">
                    {analysis.recommendation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {activeDevices.map((device) => (
                  <div
                    key={device.id}
                    className="flex flex-col gap-3 rounded-xl bg-[#F4F8F3] p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex flex-1 items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#43865A]">
                        <Check size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">
                          {device.name}
                        </p>
                        <p className="mt-1 text-xs text-[#718276]">
                          {formatPowerWatts(device.power * 1000)} ·{' '}
                          {formatDuration(device.hours)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-medium text-[#315A40]">
                      <Clock3 size={16} className="text-[#43865A]" />
                      {device.start}
                    </div>

                    <span className="w-fit rounded-lg border border-[#DCE6D9] bg-white px-3 py-2 text-xs text-[#718276]">
                      {device.flexible ? 'Flexible' : 'Fixed schedule'}
                    </span>
                  </div>
                ))}

                <p className="text-xs leading-5 text-[#94A397]">
                  Preferred times are local UI settings and are not saved to
                  the backend. The current optimizer calculates energy balance;
                  it does not determine optimal appliance start times or actual
                  financial savings.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#DCE6D9] bg-[#E7F1E5] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#43865A]">
                <ShieldCheck size={22} />
              </span>
              <div>
                <h3 className="font-semibold">
                  Recommendations before automation
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#526F5A]">
                  This interface does not control appliances. Before enabling
                  real automation, Wattora will need validated device
                  constraints, user confirmation, safety checks, and a backend
                  optimization service.
                </p>
              </div>
            </div>
          </section>

          <footer className="flex flex-col justify-between gap-2 border-t border-[#E1EAE0] py-5 text-xs text-[#94A397] sm:flex-row">
            <p>© 2026 Wattora · Smarter energy, naturally.</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 hover:text-[#43865A]"
            >
              Back to overview <ArrowRight size={13} />
            </Link>
          </footer>
        </main>
      </div>
    </div>
  )
}
