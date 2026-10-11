
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  Clock,
  Gauge,
  LayoutDashboard,
  Leaf,
  LockKeyhole,
  Save,
  Settings as SettingsIcon,
  Sun,
  Zap,
  BatteryCharging,
} from 'lucide-react'
import {
  getUserPreferences,
  saveUserPreferences,
  type UserPreferences,
} from '../services/api'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Solar forecast', icon: Sun, href: '/solar' },
  { label: 'Energy demand', icon: Activity, href: '/energy' },
  { label: 'Optimization', icon: Zap, href: '/optimization' },
  { label: 'Devices', icon: BatteryCharging, href: '/devices' },
]

const priorityOptions: {
  value: UserPreferences['optimization_priority']
  title: string
  detail: string
}[] = [
  {
    value: 'savings',
    title: 'Lower cost',
    detail: 'Prioritize estimated bill savings.',
  },
  {
    value: 'balanced',
    title: 'Balanced',
    detail: 'Balance cost and solar usage.',
  },
  {
    value: 'solar',
    title: 'Use more solar',
    detail: 'Favor available renewable energy.',
  },
]

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium text-[#244A35]">{label}</p>
        <p className="mt-1 max-w-lg text-xs leading-5 text-[#718276]">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-[#43865A]' : 'bg-[#CDD7CB]'
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

export default function Settings() {
  const [solarAlerts, setSolarAlerts] = useState(true)
  const [demandAlerts, setDemandAlerts] = useState(true)
  const [weeklySummary, setWeeklySummary] = useState(false)
  const [highUsageAlerts, setHighUsageAlerts] = useState(true)
  const [forecastHorizon, setForecastHorizon] = useState('24')
  const [forecastInterval, setForecastInterval] =
    useState<UserPreferences['forecast_interval']>('hourly')
  const [optimizationPriority, setOptimizationPriority] =
    useState<UserPreferences['optimization_priority']>('balanced')
  const [batteryReserve, setBatteryReserve] = useState(20)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSucceeded, setSaveSucceeded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadPreferences() {
      try {
        const preferences = await getUserPreferences()
        if (cancelled) return

        setSolarAlerts(preferences.solar_alerts)
        setDemandAlerts(preferences.demand_alerts)
        setHighUsageAlerts(preferences.high_usage_alerts)
        setWeeklySummary(preferences.weekly_summary)
        setForecastHorizon(String(preferences.forecast_horizon))
        setForecastInterval(preferences.forecast_interval)
        setOptimizationPriority(preferences.optimization_priority)
        setBatteryReserve(preferences.battery_reserve)
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load your settings.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadPreferences()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaveSucceeded(false)
    setMessage('')

    const preferences: UserPreferences = {
      solar_alerts: solarAlerts,
      demand_alerts: demandAlerts,
      high_usage_alerts: highUsageAlerts,
      weekly_summary: weeklySummary,
      forecast_horizon: Number(forecastHorizon),
      forecast_interval: forecastInterval,
      optimization_priority: optimizationPriority,
      battery_reserve: batteryReserve,
    }

    try {
      const saved = await saveUserPreferences(preferences)
      setSolarAlerts(saved.solar_alerts)
      setDemandAlerts(saved.demand_alerts)
      setHighUsageAlerts(saved.high_usage_alerts)
      setWeeklySummary(saved.weekly_summary)
      setForecastHorizon(String(saved.forecast_horizon))
      setForecastInterval(saved.forecast_interval)
      setOptimizationPriority(saved.optimization_priority)
      setBatteryReserve(saved.battery_reserve)
      setSaveSucceeded(true)
      setMessage('Your settings have been saved.')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to save your settings.',
      )
    } finally {
      setSaving(false)
    }
  }

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
            return (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#718276] transition hover:bg-[#F4F8F3] hover:text-[#244A35]"
              >
                <Icon size={19} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-8 border-t border-[#E8EEE6] pt-6">
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#718276] hover:bg-[#F4F8F3]"
          >
            <SettingsIcon size={19} />
            Profile
          </Link>
          <div className="flex items-center gap-3 rounded-xl bg-[#E7F1E5] px-3 py-3 text-sm font-semibold text-[#315A40]">
            <SettingsIcon size={19} />
            Settings
          </div>
        </div>

        <div className="mt-auto rounded-2xl bg-[#F4F8F3] p-4">
          <Leaf size={22} className="text-[#43865A]" />
          <p className="mt-3 text-sm font-semibold">Smarter energy choices</p>
          <p className="mt-1 text-xs leading-5 text-[#718276]">
            Configure how Wattora presents forecasts and recommendations.
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="flex h-[76px] items-center justify-between border-b border-[#E4ECE1] bg-white px-4 sm:px-8">
          <div>
            <p className="text-xs text-[#718276]">Account</p>
            <h1 className="text-lg font-semibold sm:text-xl">Settings</h1>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE6D9] px-3 py-2.5 text-sm font-medium text-[#526F5A] transition hover:bg-[#F4F8F3] sm:px-4"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to dashboard</span>
            <span className="sm:hidden">Dashboard</span>
          </Link>
        </header>

        <main className="mx-auto max-w-5xl space-y-7 p-4 sm:p-8">
          <section>
            <p className="text-sm font-medium text-[#43865A]">PREFERENCES</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Set things your way.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718276]">
              Fine-tune forecast displays, energy alerts, and optimization
              preferences for your Wattora workspace.
            </p>
          </section>

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-7">
              <div className="flex items-center gap-3 border-b border-[#E8EEE6] pb-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <Bell size={20} />
                </span>
                <div>
                  <h3 className="font-semibold">Notifications</h3>
                  <p className="mt-1 text-xs text-[#718276]">
                    Choose which updates you want to see
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[#EEF2EC]">
                <Toggle
                  label="Solar forecast updates"
                  description="Notify me when solar production forecasts are refreshed."
                  checked={solarAlerts}
                  onChange={setSolarAlerts}
                />
                <Toggle
                  label="Demand forecast updates"
                  description="Show updates about expected household electricity demand."
                  checked={demandAlerts}
                  onChange={setDemandAlerts}
                />
                <Toggle
                  label="High energy usage"
                  description="Flag periods when predicted demand is unusually high."
                  checked={highUsageAlerts}
                  onChange={setHighUsageAlerts}
                />
                <Toggle
                  label="Weekly energy summary"
                  description="Show a weekly overview of estimated production, usage, and savings."
                  checked={weeklySummary}
                  onChange={setWeeklySummary}
                />
              </div>
              <p className="mt-3 rounded-xl bg-[#F4F8F3] p-3 text-xs leading-5 text-[#718276]">
                These notification preferences are saved to your account. Sending
                alerts requires an email or push-notification delivery service.
              </p>
            </section>

            <section className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-7">
              <div className="flex items-center gap-3 border-b border-[#E8EEE6] pb-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <Gauge size={20} />
                </span>
                <div>
                  <h3 className="font-semibold">Forecast preferences</h3>
                  <p className="mt-1 text-xs text-[#718276]">
                    Adjust the period and detail shown in forecasts
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="horizon" className="mb-2 block text-sm font-medium">
                    Forecast horizon
                  </label>
                  <select
                    id="horizon"
                    value={forecastHorizon}
                    onChange={(event) => setForecastHorizon(event.target.value)}
                    className="w-full rounded-xl border border-[#DCE6D9] bg-white px-4 py-3 text-sm outline-none focus:border-[#43865A]"
                  >
                    <option value="12">Next 12 hours</option>
                    <option value="24">Next 24 hours</option>
                    <option value="48">Next 48 hours</option>
                    <option value="168">Next 7 days</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="interval" className="mb-2 block text-sm font-medium">
                    Forecast detail
                  </label>
                  <select
                    id="interval"
                    value={forecastInterval}
                    onChange={(event) =>
                      setForecastInterval(
                        event.target.value === 'daily' ? 'daily' : 'hourly',
                      )
                    }
                    className="w-full rounded-xl border border-[#DCE6D9] bg-white px-4 py-3 text-sm outline-none focus:border-[#43865A]"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-xl bg-[#F4F8F3] p-4">
                <Clock size={18} className="mt-0.5 shrink-0 text-[#43865A]" />
                <p className="text-xs leading-5 text-[#718276]">
                  Selected: {forecastHorizon === '168' ? '7 days' : `${forecastHorizon} hours`},
                  {' '}{forecastInterval} detail.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-7">
              <div className="flex items-center gap-3 border-b border-[#E8EEE6] pb-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <Zap size={20} />
                </span>
                <div>
                  <h3 className="font-semibold">Optimization preferences</h3>
                  <p className="mt-1 text-xs text-[#718276]">
                    Define what matters most in your energy plan
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-sm font-medium">Optimization priority</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {priorityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setOptimizationPriority(option.value)}
                      className={`rounded-xl border p-4 text-left transition ${
                        optimizationPriority === option.value
                          ? 'border-[#43865A] bg-[#F4F8F3] ring-2 ring-[#43865A]/10'
                          : 'border-[#E4ECE1] hover:border-[#ACCEAA]'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{option.title}</span>
                        {optimizationPriority === option.value && (
                          <Check size={17} className="text-[#43865A]" />
                        )}
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-[#718276]">
                        {option.detail}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-[#E8EEE6] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Minimum battery reserve</p>
                    <p className="mt-1 text-xs leading-5 text-[#718276]">
                      Preferred charge level to keep available before flexible use.
                    </p>
                  </div>
                  <span className="rounded-lg bg-[#E7F1E5] px-3 py-1.5 text-sm font-semibold text-[#315A40]">
                    {batteryReserve}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={batteryReserve}
                  onChange={(event) => setBatteryReserve(Number(event.target.value))}
                  aria-label="Minimum battery reserve percentage"
                  className="mt-5 w-full accent-[#43865A]"
                />
                <div className="mt-1 flex justify-between text-xs text-[#94A397]">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <LockKeyhole size={20} />
                </span>
                <div>
                  <h3 className="font-semibold">Account security</h3>
                  <p className="mt-1 text-xs text-[#718276]">
                    Manage account details and sign-in options
                  </p>
                </div>
              </div>

              <Link
                to="/profile"
                className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[#E4ECE1] p-4 transition hover:bg-[#F4F8F3]"
              >
                <div>
                  <p className="text-sm font-medium">Personal information</p>
                  <p className="mt-1 text-xs text-[#718276]">
                    Update your name, location, and home energy details.
                  </p>
                </div>
                <ChevronRight size={19} className="shrink-0 text-[#718276]" />
              </Link>

              <div className="mt-3 rounded-xl bg-[#F4F8F3] p-4 text-xs leading-5 text-[#718276]">
                Password changes and active-session management are not currently
                available.
              </div>
            </section>

            {message && (
              <div
                role="status"
                className={`rounded-xl p-4 text-sm leading-6 ${
                  saveSucceeded
                    ? 'bg-[#E7F1E5] text-[#315A40]'
                    : 'bg-[#FBEDE7] text-[#A45D43]'
                }`}
              >
                {message}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-[#94A397]">
                {loading ? 'Loading settings…' : 'Settings are saved to your account.'}
              </p>
              <button
                type="submit"
                disabled={loading || saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#43865A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#36734B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={17} />
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </form>

          <section className="rounded-2xl border border-[#DCE6D9] bg-[#E7F1E5] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#43865A]">
                <Leaf size={22} />
              </span>
              <div>
                <h3 className="font-semibold">Small changes, smarter energy</h3>
                <p className="mt-2 text-sm leading-6 text-[#526F5A]">
                  These preferences are stored with your account. The current
                  forecasting models and optimizer do not yet use these choices
                  to alter their predictions.
                </p>
                <Link
                  to="/optimization"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#36734B] hover:text-[#244A35]"
                >
                  View optimization <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </section>

          <footer className="flex flex-col justify-between gap-2 border-t border-[#E1EAE0] py-5 text-xs text-[#94A397] sm:flex-row">
            <p>© 2026 Wattora · Smarter energy, naturally.</p>
            <Link to="/dashboard" className="inline-flex items-center gap-1 hover:text-[#43865A]">
              Back to overview <ArrowRight size={13} />
            </Link>
          </footer>
        </main>
      </div>
    </div>
  )
}
