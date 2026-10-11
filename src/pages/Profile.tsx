
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  House,
  LayoutDashboard,
  Leaf,
  MapPin,
  Save,
  Settings,
  Sun,
  UserRound,
  Zap,
} from 'lucide-react'
import {
  getUserProfile,
  saveUserProfile,
  type UserProfile,
} from '../services/api'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Solar forecast', icon: Sun, href: '/solar' },
  { label: 'Energy demand', icon: Activity, href: '/energy' },
  { label: 'Optimization', icon: Zap, href: '/optimization' },
  { label: 'Devices', icon: BatteryCharging, href: '/devices' },
]

export default function Profile() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [location, setLocation] = useState('')
  const [homeType, setHomeType] = useState('House')
  const [solarCapacity, setSolarCapacity] = useState('5')
  const [electricityRate, setElectricityRate] = useState('8')
  const [energyUnit, setEnergyUnit] = useState('kWh')
  const [currency, setCurrency] = useState('INR')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const profile: UserProfile = await getUserProfile()
        if (cancelled) return

        setFullName(profile.full_name)
        setEmail(profile.email)
        setLocation(profile.location)
        setHomeType(profile.home_type)
        setSolarCapacity(String(profile.solar_capacity))
        setElectricityRate(String(profile.electricity_rate))
        setEnergyUnit(profile.energy_unit)
        setCurrency(profile.currency)
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load your profile.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!fullName.trim()) {
      setMessage('Please enter your name.')
      return
    }

    if (
      !Number.isFinite(Number(solarCapacity)) ||
      Number(solarCapacity) < 0
    ) {
      setMessage('Solar capacity must be zero or greater.')
      return
    }

    if (
      !Number.isFinite(Number(electricityRate)) ||
      Number(electricityRate) < 0
    ) {
      setMessage('Electricity rate must be zero or greater.')
      return
    }

    setSaving(true)
    setMessage('')
    try {
      const profile = await saveUserProfile({
        full_name: fullName.trim(),
        location: location.trim(),
        home_type: homeType,
        solar_capacity: Number(solarCapacity),
        electricity_rate: Number(electricityRate),
        energy_unit: energyUnit,
        currency,
      })
      setFullName(profile.full_name)
      setMessage('Your profile has been saved.')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to save your profile.',
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
          <div className="flex items-center gap-3 rounded-xl bg-[#E7F1E5] px-3 py-3 text-sm font-semibold text-[#315A40]">
            <Settings size={19} />
            Profile & settings
          </div>
        </div>

        <div className="mt-auto rounded-2xl bg-[#F4F8F3] p-4">
          <Leaf size={22} className="text-[#43865A]" />
          <p className="mt-3 text-sm font-semibold">Your energy profile</p>
          <p className="mt-1 text-xs leading-5 text-[#718276]">
            More accurate home and tariff details can improve future estimates.
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="flex h-[76px] items-center justify-between border-b border-[#E4ECE1] bg-white px-4 sm:px-8">
          <div>
            <p className="text-xs text-[#718276]">Account</p>
            <h1 className="text-lg font-semibold sm:text-xl">Profile & settings</h1>
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
            <p className="text-sm font-medium text-[#43865A]">YOUR ACCOUNT</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Make Wattora yours.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718276]">
              Set up your profile and energy preferences so future forecasts and
              recommendations can better reflect your household.
            </p>
          </section>

          <section className="flex flex-col gap-5 rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:flex-row sm:items-center sm:p-7">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E7F1E5] text-[#43865A]">
              <UserRound size={30} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold">{fullName || 'Your name'}</h3>
              <p className="mt-1 break-all text-sm text-[#718276]">{email || 'Your email'}</p>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F4F8F3] px-3 py-1 text-xs font-medium text-[#526F5A]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#43865A]" />
                Account profile
              </p>
            </div>
            <div className="rounded-xl bg-[#F4F8F3] px-4 py-3 text-sm text-[#526F5A]">
              <p className="font-medium">Energy workspace</p>
              <p className="mt-1 text-xs text-[#718276]">Personal setup</p>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="space-y-7">
            <section className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-7">
              <div className="flex items-center gap-3 border-b border-[#E8EEE6] pb-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <UserRound size={20} />
                </span>
                <div>
                  <h3 className="font-semibold">Personal information</h3>
                  <p className="mt-1 text-xs text-[#718276]">Basic account details</p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="fullName" className="mb-2 block text-sm font-medium">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    maxLength={100}
                    required
                    placeholder="Enter your name"
                    className="w-full rounded-xl border border-[#DCE6D9] px-4 py-3 text-sm outline-none transition focus:border-[#43865A] focus:ring-4 focus:ring-[#43865A]/10"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    maxLength={254}
                    readOnly
                    aria-describedby="email-help"
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[#DCE6D9] bg-[#F4F8F3] px-4 py-3 text-sm outline-none"
                  />
                  <p id="email-help" className="mt-2 text-xs text-[#94A397]">
                    Email address changes are not currently supported.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-7">
              <div className="flex items-center gap-3 border-b border-[#E8EEE6] pb-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <House size={20} />
                </span>
                <div>
                  <h3 className="font-semibold">Home energy setup</h3>
                  <p className="mt-1 text-xs text-[#718276]">Details used by your energy workspace</p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="location" className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <MapPin size={15} className="text-[#43865A]" />
                    Location
                  </label>
                  <input
                    id="location"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    maxLength={150}
                    placeholder="City or region"
                    className="w-full rounded-xl border border-[#DCE6D9] px-4 py-3 text-sm outline-none transition focus:border-[#43865A] focus:ring-4 focus:ring-[#43865A]/10"
                  />
                  <p className="mt-2 text-xs text-[#94A397]">
                    Used later to select relevant solar and weather data.
                  </p>
                </div>

                <div>
                  <label htmlFor="homeType" className="mb-2 block text-sm font-medium">
                    Property type
                  </label>
                  <select
                    id="homeType"
                    value={homeType}
                    onChange={(event) => setHomeType(event.target.value)}
                    className="w-full rounded-xl border border-[#DCE6D9] bg-white px-4 py-3 text-sm outline-none focus:border-[#43865A]"
                  >
                    <option>House</option>
                    <option>Apartment</option>
                    <option>Small business</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="solarCapacity" className="mb-2 block text-sm font-medium">
                    Installed solar capacity (kW)
                  </label>
                  <input
                    id="solarCapacity"
                    type="number"
                    min="0"
                    max="10000"
                    step="0.1"
                    value={solarCapacity}
                    onChange={(event) => setSolarCapacity(event.target.value)}
                    className="w-full rounded-xl border border-[#DCE6D9] px-4 py-3 text-sm outline-none transition focus:border-[#43865A] focus:ring-4 focus:ring-[#43865A]/10"
                  />
                  <p className="mt-2 text-xs text-[#94A397]">
                    Enter 0 if you do not have solar panels.
                  </p>
                </div>

                <div>
                  <label htmlFor="electricityRate" className="mb-2 block text-sm font-medium">
                    Electricity rate (per kWh)
                  </label>
                  <input
                    id="electricityRate"
                    type="number"
                    min="0"
                    max="100000"
                    step="0.01"
                    value={electricityRate}
                    onChange={(event) => setElectricityRate(event.target.value)}
                    className="w-full rounded-xl border border-[#DCE6D9] px-4 py-3 text-sm outline-none transition focus:border-[#43865A] focus:ring-4 focus:ring-[#43865A]/10"
                  />
                  <p className="mt-2 text-xs text-[#94A397]">
                    Use your approximate rate from your electricity bill.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-7">
              <div className="flex items-center gap-3 border-b border-[#E8EEE6] pb-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <Settings size={20} />
                </span>
                <div>
                  <h3 className="font-semibold">Display preferences</h3>
                  <p className="mt-1 text-xs text-[#718276]">Choose how energy information is displayed</p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="energyUnit" className="mb-2 block text-sm font-medium">
                    Energy unit
                  </label>
                  <select
                    id="energyUnit"
                    value={energyUnit}
                    onChange={(event) => setEnergyUnit(event.target.value)}
                    className="w-full rounded-xl border border-[#DCE6D9] bg-white px-4 py-3 text-sm outline-none focus:border-[#43865A]"
                  >
                    <option value="kWh">Kilowatt-hours (kWh)</option>
                    <option value="MWh">Megawatt-hours (MWh)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="currency" className="mb-2 block text-sm font-medium">
                    Currency
                  </label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                    className="w-full rounded-xl border border-[#DCE6D9] bg-white px-4 py-3 text-sm outline-none focus:border-[#43865A]"
                  >
                    <option value="INR">Indian Rupee (₹ INR)</option>
                    <option value="USD">US Dollar ($ USD)</option>
                    <option value="EUR">Euro (€ EUR)</option>
                    <option value="GBP">British Pound (£ GBP)</option>
                  </select>
                </div>
              </div>
            </section>

            {message && (
              <div
                role="status"
                className={`rounded-xl p-4 text-sm leading-6 ${
                  message.startsWith('Your profile')
                    ? 'bg-[#E7F1E5] text-[#315A40]'
                    : 'bg-[#FBEDE7] text-[#A45D43]'
                }`}
              >
                {message}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-[#94A397]">
                {loading ? 'Loading profile…' : 'Profile details are saved to your account.'}
              </p>
              <button
                type="submit"
                disabled={loading || saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#43865A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#36734B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={17} />
                {saving ? 'Saving…' : 'Save preferences'}
              </button>
            </div>
          </form>

          <section className="rounded-2xl border border-[#DCE6D9] bg-[#E7F1E5] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#43865A]">
                <Zap size={22} />
              </span>
              <div>
                <h3 className="font-semibold">Your next step</h3>
                <p className="mt-2 text-sm leading-6 text-[#526F5A]">
                  Your saved home details are available to the Wattora energy
                  workspace and can be used to configure your forecasts.
                </p>
                <Link
                  to="/optimization"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#36734B] hover:text-[#244A35]"
                >
                  Explore optimization <ArrowRight size={16} />
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
