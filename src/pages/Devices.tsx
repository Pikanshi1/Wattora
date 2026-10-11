
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BatteryCharging,
  Check,
  CirclePlus,
  Leaf,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Pencil,
  PlugZap,
  Power,
  Search,
  Settings,
  Sun,
  Trash2,
  WashingMachine,
  X,
  Zap,
} from 'lucide-react'

import {
  createDevice,
  deleteDevice,
  getDevices,
  getSites,
  setDeviceEnabled,
  updateDevice,
  type Device as ApiDevice,
  type DeviceInput,
} from '../services/api'
import {
  getActiveSiteId,
  setActiveSiteId,
} from '../services/activeSite'

type DeviceCategory = 'Appliances' | 'Climate' | 'Other'

type Device = {
  id: number
  name: string
  category: DeviceCategory
  power: number
  hours: number
  flexible: boolean
  enabled: boolean
}

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Solar forecast', icon: Sun, href: '/solar' },
  { label: 'Energy demand', icon: Activity, href: '/energy' },
  { label: 'Optimization', icon: Lightbulb, href: '/optimization' },
  { label: 'Devices', icon: BatteryCharging, href: '/devices' },
]

function toPageDevice(device: ApiDevice): Device {
  return {
    id: device.id,
    name: device.name,
    category: device.category,
    power: device.power,
    hours: device.hours,
    flexible: device.flexible,
    enabled: device.enabled,
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message)
      if (typeof parsed.detail === 'string') {
        return parsed.detail
      }
    } catch {
      // The error is not JSON; use its original message.
    }

    return error.message
  }

  return 'Something went wrong. Please try again.'
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [activeSiteId, setCurrentSiteId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pageMessage, setPageMessage] = useState('')

  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formMessage, setFormMessage] = useState('')

  const [name, setName] = useState('')
  const [category, setCategory] = useState<DeviceCategory>('Appliances')
  const [power, setPower] = useState('1')
  const [hours, setHours] = useState('1')
  const [flexible, setFlexible] = useState(true)

  // Load the saved devices for the selected site.
  useEffect(() => {
    let cancelled = false

    async function loadDevices() {
      setLoading(true)
      setPageMessage('')

      try {
        const sites = await getSites()

        if (cancelled) return

        if (sites.length === 0) {
          setCurrentSiteId(null)
          setDevices([])
          setPageMessage(
            'No sites found. Create a site before adding devices.',
          )
          return
        }

        const savedSiteId = getActiveSiteId()

        const site =
          sites.find((item) => item.id === savedSiteId) ??
          sites.find((item) => item.is_primary) ??
          sites[0]

        if (savedSiteId !== site.id) {
          setActiveSiteId(site.id)
        }

        setCurrentSiteId(site.id)

        const result = await getDevices(site.id)

        if (cancelled) return

        setDevices(result.map(toPageDevice))
      } catch (error) {
        if (cancelled) return

        setDevices([])
        setPageMessage(
          `Could not load devices: ${errorMessage(error)}`,
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDevices()

    return () => {
      cancelled = true
    }
  }, [])

  const totalDailyEnergy = useMemo(
    () =>
      devices
        .filter((device) => device.enabled)
        .reduce((total, device) => total + device.power * device.hours, 0),
    [devices],
  )

  const activeCount = devices.filter((device) => device.enabled).length

  const flexibleCount = devices.filter(
    (device) => device.enabled && device.flexible,
  ).length

  const filteredDevices = devices.filter((device) => {
    const matchesSearch = device.name
      .toLowerCase()
      .includes(search.toLowerCase())

    const matchesFilter =
      filter === 'All' ||
      (filter === 'Enabled' && device.enabled) ||
      (filter === 'Disabled' && !device.enabled) ||
      (filter === 'Flexible' && device.flexible)

    return matchesSearch && matchesFilter
  })

  function resetForm() {
    setName('')
    setCategory('Appliances')
    setPower('1')
    setHours('1')
    setFlexible(true)
    setEditingId(null)
    setFormMessage('')
    setShowForm(false)
  }

  function openAddForm() {
    setName('')
    setCategory('Appliances')
    setPower('1')
    setHours('1')
    setFlexible(true)
    setEditingId(null)
    setFormMessage('')
    setShowForm(true)
  }

  function openEditForm(device: Device) {
    setName(device.name)
    setCategory(device.category)
    setPower(String(device.power))
    setHours(String(device.hours))
    setFlexible(device.flexible)
    setEditingId(device.id)
    setFormMessage('')
    setShowForm(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormMessage('')

    if (activeSiteId === null) {
      setFormMessage('Select or create a site before saving a device.')
      return
    }

    const trimmedName = name.trim()
    const powerValue = Number(power)
    const hoursValue = Number(hours)

    if (
      !trimmedName ||
      trimmedName.length > 60 ||
      !Number.isFinite(powerValue) ||
      powerValue <= 0 ||
      powerValue > 100 ||
      !Number.isFinite(hoursValue) ||
      hoursValue <= 0 ||
      hoursValue > 24
    ) {
      setFormMessage(
        'Enter a device name, power greater than 0 and at most 100 kW, and usage greater than 0 and at most 24 hours.',
      )
      return
    }

    const existingDevice =
      editingId === null
        ? undefined
        : devices.find((device) => device.id === editingId)

    const input: DeviceInput = {
      site_id: activeSiteId,
      name: trimmedName,
      category,
      power: powerValue,
      hours: hoursValue,
      flexible,
      // Preserve the enabled state when editing an existing device.
      enabled: existingDevice?.enabled ?? true,
    }

    setBusy(true)
    setPageMessage('')

    try {
      if (editingId !== null) {
        const updated = await updateDevice(editingId, input)
        setDevices((current) =>
          current.map((device) =>
            device.id === editingId ? toPageDevice(updated) : device,
          ),
        )
      } else {
        const created = await createDevice(input)
        setDevices((current) => [...current, toPageDevice(created)])
      }

      resetForm()
    } catch (error) {
      setFormMessage(`Could not save device: ${errorMessage(error)}`)
    } finally {
      setBusy(false)
    }
  }

  async function toggleDevice(id: number) {
    const device = devices.find((item) => item.id === id)
    if (!device) return

    setPageMessage('')

    try {
      const updated = await setDeviceEnabled(id, !device.enabled)

      setDevices((current) =>
        current.map((item) =>
          item.id === id ? toPageDevice(updated) : item,
        ),
      )
    } catch (error) {
      setPageMessage(`Could not change device status: ${errorMessage(error)}`)
    }
  }

  async function deleteDevice(id: number) {
    const device = devices.find((item) => item.id === id)
    if (!device) return

    if (!window.confirm(`Delete "${device.name}"? This cannot be undone.`)) {
      return
    }

    setPageMessage('')

    try {
      await deleteDeviceRequest(id)
      setDevices((current) => current.filter((item) => item.id !== id))
    } catch (error) {
      setPageMessage(`Could not delete device: ${errorMessage(error)}`)
    }
  }

  function deviceIcon(category: DeviceCategory) {
    if (category === 'Climate') return Power
    if (category === 'Other') return PlugZap
    return WashingMachine
  }

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
            const active = item.href === '/devices'

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
            Know what uses your energy.
          </p>
          <p className="mt-1 text-xs leading-5 text-[#718276]">
            Device details help Wattora make more informed recommendations.
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
              <h1 className="text-lg font-semibold sm:text-xl">Devices</h1>
              <p className="hidden text-xs text-[#718276] sm:block">
                Manage appliances and their energy requirements
              </p>
            </div>
          </div>

          <button
            onClick={openAddForm}
            disabled={loading || activeSiteId === null}
            className="inline-flex items-center gap-2 rounded-xl bg-[#43865A] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#36734B] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
          >
            <CirclePlus size={17} />
            <span>Add device</span>
          </button>
        </header>

        <main className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-8">
          <section>
            <p className="text-sm font-medium text-[#43865A]">
              DEVICE MANAGEMENT
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Your energy, device by device.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718276]">
              Add your appliances, estimate their energy needs, and mark
              flexible devices that could be scheduled around solar production.
            </p>
          </section>

          {pageMessage && (
            <div
              role="alert"
              className="rounded-xl border border-[#F0E0DB] bg-[#FBEDE7] p-4 text-sm text-[#A45D43]"
            >
              {pageMessage}
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#718276]">Total devices</p>
                <BatteryCharging size={20} className="text-[#43865A]" />
              </div>
              <p className="mt-4 text-3xl font-semibold">{devices.length}</p>
              <p className="mt-2 text-xs text-[#94A397]">
                Saved for this site
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#718276]">Enabled devices</p>
                <Activity size={20} className="text-[#43865A]" />
              </div>
              <p className="mt-4 text-3xl font-semibold">{activeCount}</p>
              <p className="mt-2 text-xs text-[#94A397]">
                Included in estimated usage
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#718276]">Estimated daily energy</p>
                <Zap size={20} className="text-[#43865A]" />
              </div>
              <p className="mt-4 text-3xl font-semibold">
                {totalDailyEnergy.toFixed(2)}{' '}
                <span className="text-sm font-normal text-[#718276]">
                  kWh*
                </span>
              </p>
              <p className="mt-2 text-xs text-[#94A397]">
                Based on rated power × usage hours
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-semibold">Your devices</h3>
                <p className="mt-1 text-sm text-[#718276]">
                  {flexibleCount} enabled flexible device
                  {flexibleCount === 1 ? '' : 's'} available for planning
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex items-center gap-2 rounded-xl border border-[#E4ECE1] px-3 py-2.5">
                  <Search size={17} className="text-[#94A397]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search devices"
                    aria-label="Search devices"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[#94A397] sm:w-40"
                  />
                </label>

                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  aria-label="Filter devices"
                  className="rounded-xl border border-[#E4ECE1] bg-white px-3 py-2.5 text-sm text-[#315A40] outline-none"
                >
                  <option>All</option>
                  <option>Enabled</option>
                  <option>Disabled</option>
                  <option>Flexible</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="mt-6 rounded-xl bg-[#F4F8F3] p-8 text-center">
                <p className="text-sm font-medium">Loading devices...</p>
                <p className="mt-1 text-xs text-[#718276]">
                  Fetching saved devices from Wattora.
                </p>
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="mt-6 rounded-xl bg-[#F4F8F3] p-8 text-center">
                <Search size={24} className="mx-auto text-[#94A397]" />
                <p className="mt-3 text-sm font-medium">
                  {devices.length === 0
                    ? 'No devices saved for this site yet'
                    : 'No matching devices'}
                </p>
                <p className="mt-1 text-xs text-[#718276]">
                  {devices.length === 0
                    ? 'Use Add device to create your first device.'
                    : 'Try a different search or filter.'}
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {filteredDevices.map((device) => {
                  const Icon = deviceIcon(device.category)

                  return (
                    <article
                      key={device.id}
                      className={`rounded-2xl border p-4 transition sm:p-5 ${
                        device.enabled
                          ? 'border-[#E4ECE1] bg-white'
                          : 'border-[#E8EEE6] bg-[#FAFCF9]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                            <Icon size={22} />
                          </span>
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold">
                              {device.name}
                            </h4>
                            <p className="mt-1 text-xs text-[#718276]">
                              {device.category}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-[#F4F8F3] px-2.5 py-1 text-xs text-[#526F5A]">
                                {device.flexible
                                  ? 'Flexible load'
                                  : 'Essential load'}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs ${
                                  device.enabled
                                    ? 'bg-[#E7F1E5] text-[#36734B]'
                                    : 'bg-[#F0F1EF] text-[#718276]'
                                }`}
                              >
                                {device.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 sm:w-48">
                          <div>
                            <p className="text-xs text-[#94A397]">
                              Rated power
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {device.power} kW
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#94A397]">
                              Usage/day
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {device.hours} h
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-[#94A397]">
                              Estimated energy
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {(device.power * device.hours).toFixed(2)} kWh/day
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 border-t border-[#E8EEE6] pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                          <button
                            onClick={() => void toggleDevice(device.id)}
                            title={
                              device.enabled ? 'Disable device' : 'Enable device'
                            }
                            aria-label={
                              device.enabled
                                ? `Disable ${device.name}`
                                : `Enable ${device.name}`
                            }
                            className={`rounded-lg p-2.5 transition ${
                              device.enabled
                                ? 'bg-[#E7F1E5] text-[#36734B] hover:bg-[#DCEAD9]'
                                : 'bg-[#F4F8F3] text-[#718276] hover:bg-[#E7F1E5]'
                            }`}
                          >
                            <Power size={17} />
                          </button>
                          <button
                            onClick={() => openEditForm(device)}
                            title="Edit device"
                            aria-label={`Edit ${device.name}`}
                            className="rounded-lg border border-[#E4ECE1] p-2.5 text-[#718276] hover:bg-[#F4F8F3] hover:text-[#315A40]"
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            onClick={() => void deleteDevice(device.id)}
                            title="Delete device"
                            aria-label={`Delete ${device.name}`}
                            className="rounded-lg border border-[#F0E0DB] p-2.5 text-[#A45D43] hover:bg-[#FBEDE7]"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}

            <p className="mt-5 text-xs leading-5 text-[#94A397]">
              *These are estimates from entered rated power and daily usage.
              Actual consumption depends on device behavior and operating
              conditions. Device changes are saved to the backend.
            </p>
          </section>

          {showForm && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#193326]/35 p-4"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) resetForm()
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="device-form-title"
                className="my-auto w-full max-w-lg rounded-2xl border border-[#E4ECE1] bg-white p-6 shadow-xl sm:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3
                      id="device-form-title"
                      className="text-xl font-semibold"
                    >
                      {editingId === null ? 'Add a device' : 'Edit device'}
                    </h3>
                    <p className="mt-1 text-sm text-[#718276]">
                      Enter its typical power and daily usage.
                    </p>
                  </div>
                  <button
                    onClick={resetForm}
                    disabled={busy}
                    aria-label="Close device form"
                    className="rounded-lg p-2 text-[#718276] hover:bg-[#F4F8F3] disabled:opacity-50"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  <div>
                    <label
                      htmlFor="deviceName"
                      className="mb-2 block text-sm font-medium"
                    >
                      Device name
                    </label>
                    <input
                      id="deviceName"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      maxLength={60}
                      placeholder="e.g. Electric oven"
                      className="w-full rounded-xl border border-[#DCE6D9] px-4 py-3 text-sm outline-none focus:border-[#43865A] focus:ring-4 focus:ring-[#43865A]/10"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="deviceCategory"
                      className="mb-2 block text-sm font-medium"
                    >
                      Category
                    </label>
                    <select
                      id="deviceCategory"
                      value={category}
                      onChange={(event) =>
                        setCategory(event.target.value as DeviceCategory)
                      }
                      className="w-full rounded-xl border border-[#DCE6D9] bg-white px-4 py-3 text-sm outline-none focus:border-[#43865A]"
                    >
                      <option>Appliances</option>
                      <option>Climate</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="devicePower"
                        className="mb-2 block text-sm font-medium"
                      >
                        Rated power (kW)
                      </label>
                      <input
                        id="devicePower"
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        value={power}
                        onChange={(event) => setPower(event.target.value)}
                        required
                        className="w-full rounded-xl border border-[#DCE6D9] px-4 py-3 text-sm outline-none focus:border-[#43865A]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="deviceHours"
                        className="mb-2 block text-sm font-medium"
                      >
                        Usage per day (hours)
                      </label>
                      <input
                        id="deviceHours"
                        type="number"
                        min="0.01"
                        max="24"
                        step="0.25"
                        value={hours}
                        onChange={(event) => setHours(event.target.value)}
                        required
                        className="w-full rounded-xl border border-[#DCE6D9] px-4 py-3 text-sm outline-none focus:border-[#43865A]"
                      />
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#F4F8F3] p-4">
                    <input
                      type="checkbox"
                      checked={flexible}
                      onChange={(event) => setFlexible(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#43865A]"
                    />
                    <span>
                      <span className="block text-sm font-medium">
                        Flexible device
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#718276]">
                        This device may be suitable for rescheduling. Essential
                        loads should remain available as needed.
                      </span>
                    </span>
                  </label>

                  {formMessage && (
                    <p
                      role="alert"
                      className="rounded-xl bg-[#FBEDE7] p-3 text-sm text-[#A45D43]"
                    >
                      {formMessage}
                    </p>
                  )}

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={busy}
                      className="rounded-xl border border-[#DCE6D9] px-5 py-3 text-sm font-semibold text-[#526F5A] hover:bg-[#F4F8F3] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#36734B] disabled:cursor-wait disabled:opacity-60"
                    >
                      <Check size={16} />
                      {busy
                        ? 'Saving...'
                        : editingId === null
                          ? 'Add device'
                          : 'Save changes'}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}

          <section className="rounded-2xl border border-[#DCE6D9] bg-[#E7F1E5] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#43865A]">
                <Lightbulb size={22} />
              </span>
              <div>
                <h3 className="font-semibold">Ready to plan your energy?</h3>
                <p className="mt-2 text-sm leading-6 text-[#526F5A]">
                  Use enabled flexible devices as inputs to Wattora’s
                  optimization workflow. Real schedules will also account for
                  solar forecasts, tariffs, user preferences, and operating
                  limits.
                </p>
                <Link
                  to="/optimization"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#36734B] hover:text-[#244A35]"
                >
                  Go to optimization <ArrowRight size={16} />
                </Link>
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

async function deleteDeviceRequest(deviceId: number): Promise<void> {
  await deleteDevice(deviceId)
}
