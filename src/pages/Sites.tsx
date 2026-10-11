import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { setActiveSiteId, getActiveSiteId } from '../services/activeSite'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  Check,
  House,
  LayoutDashboard,
  Leaf,
  MapPin,
  Pencil,
  Plus,
  Search,
  Sun,
  Trash2,
  X,
  Zap,
} from 'lucide-react'

import {
  createSite,
  deleteSite as deleteSiteApi,
  getSites,
  setPrimarySite as setPrimarySiteApi,
  updateSite,
  type Site as ApiSite,
} from '../services/api'

type Site = {
  id: number
  name: string
  location: string
  type: string
  solarCapacity: number
  dailyUsage: number
  isPrimary: boolean
}

type SiteForm = {
  name: string
  location: string
  type: string
  solarCapacity: string
  dailyUsage: string
}

function mapApiSite(site: ApiSite): Site {
  return {
    id: site.id,
    name: site.name,
    location: site.location,
    type: site.type,
    solarCapacity: site.solar_capacity,
    dailyUsage: site.daily_usage,
    isPrimary: site.is_primary,
  }
}

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Solar forecast', icon: Sun, href: '/solar' },
  { label: 'Energy demand', icon: Activity, href: '/energy' },
  { label: 'Optimization', icon: Zap, href: '/optimization' },
  { label: 'Devices', icon: BatteryCharging, href: '/devices' },
]

const emptyForm: SiteForm = {
  name: '',
  location: '',
  type: 'House',
  solarCapacity: '0',
  dailyUsage: '10',
}

export default function Sites() {
  const [sites, setSites] = useState<Site[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<SiteForm>(emptyForm)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  const selectedSite =
    sites.find((site) => site.id === selectedId) ?? sites[0] ?? null

  async function loadSites(showLoader = true): Promise<boolean> {
    if (showLoader) setLoading(true)

    try {
      const result = await getSites()
      const mappedSites = result.map(mapApiSite)

      setSites(mappedSites)

      setSelectedId((currentId) => {
        const savedId = getActiveSiteId()
        const preferredId = currentId ?? savedId

        const preferredSite = mappedSites.find(
          (site) => site.id === preferredId,
        )

        const activeSite =
          preferredSite ??
          mappedSites.find((site) => site.isPrimary) ??
          mappedSites[0] ??
          null

        if (activeSite) {
          setActiveSiteId(activeSite.id)
        }

        return activeSite?.id ?? null
      })

      return true
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load sites. Check that the backend is running.',
      )
      return false
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  useEffect(() => {
    void loadSites()
  }, [])

  const filteredSites = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return sites

    return sites.filter(
      (site) =>
        site.name.toLowerCase().includes(query) ||
        site.location.toLowerCase().includes(query) ||
        site.type.toLowerCase().includes(query),
    )
  }, [sites, search])

  function selectSite(siteId: number) {
    setSelectedId(siteId)
    setActiveSiteId(siteId)
    setMessage('')
  }

  function openAddForm() {
    setEditingId(null)
    setForm({ ...emptyForm })
    setMessage('')
    setShowForm(true)
  }

  function openEditForm(site: Site) {
    setEditingId(site.id)
    setForm({
      name: site.name,
      location: site.location,
      type: site.type,
      solarCapacity: String(site.solarCapacity),
      dailyUsage: String(site.dailyUsage),
    })
    setMessage('')
    setShowForm(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (saving) return

    setMessage('')

    const solarCapacity = Number(form.solarCapacity)
    const dailyUsage = Number(form.dailyUsage)

    if (
      !form.name.trim() ||
      !form.location.trim() ||
      form.solarCapacity.trim() === '' ||
      form.dailyUsage.trim() === '' ||
      !Number.isFinite(solarCapacity) ||
      !Number.isFinite(dailyUsage) ||
      solarCapacity < 0 ||
      dailyUsage < 0
    ) {
      setMessage(
        'Enter a name, location, and valid non-negative energy values.',
      )
      return
    }

    setSaving(true)

    try {
      const input = {
        name: form.name.trim(),
        location: form.location.trim(),
        type: form.type,
        solar_capacity: solarCapacity,
        daily_usage: dailyUsage,
      }

      if (editingId !== null) {
        await updateSite(editingId, input)
        setMessage('Site details updated.')
      } else {
        const created = await createSite(input)
        setSelectedId(created.id)
        setActiveSiteId(created.id)
        setMessage('Site added successfully.')
      }

      setShowForm(false)
      await loadSites(false)
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to save the site.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteSite(site: Site) {
    const confirmed = window.confirm(
      `Delete "${site.name}" from your sites?`,
    )

    if (!confirmed || actionLoadingId !== null) return

    setMessage('')
    setActionLoadingId(site.id)

    try {
      await deleteSiteApi(site.id)

      if (getActiveSiteId() === site.id) {
        setActiveSiteId(-1)
      }

      setMessage(`"${site.name}" was deleted.`)
      await loadSites(false)
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to delete the site.',
      )
    } finally {
      setActionLoadingId(null)
    }
  }

  async function makePrimary(siteId: number) {
    if (actionLoadingId !== null) return

    setMessage('')
    setActionLoadingId(siteId)

    try {
      await setPrimarySiteApi(siteId)
      setSelectedId(siteId)
      setActiveSiteId(siteId)
      setMessage('Primary site updated.')
      await loadSites(false)
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update the primary site.',
      )
    } finally {
      setActionLoadingId(null)
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
            <House size={19} />
            Sites & locations
          </div>

          <Link
            to="/profile"
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#718276] hover:bg-[#F4F8F3]"
          >
            <Activity size={19} />
            Profile
          </Link>

          <Link
            to="/settings"
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#718276] hover:bg-[#F4F8F3]"
          >
            <Zap size={19} />
            Settings
          </Link>
        </div>

        <div className="mt-auto rounded-2xl bg-[#F4F8F3] p-4">
          <Leaf size={22} className="text-[#43865A]" />
          <p className="mt-3 text-sm font-semibold">Every site counts</p>
          <p className="mt-1 text-xs leading-5 text-[#718276]">
            Keep your locations organized for easier energy monitoring.
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="flex h-[76px] items-center justify-between border-b border-[#E4ECE1] bg-white px-4 sm:px-8">
          <div>
            <p className="text-xs text-[#718276]">Workspace</p>
            <h1 className="text-lg font-semibold sm:text-xl">
              Sites & locations
            </h1>
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

        <main className="mx-auto max-w-6xl space-y-7 p-4 sm:p-8">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-[#43865A]">
                YOUR LOCATIONS
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Manage your energy sites.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718276]">
                Organize homes and solar installations in one place. Select a
                site to view its setup and use it as your active workspace.
              </p>
            </div>

            <button
              onClick={openAddForm}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#36734B]"
            >
              <Plus size={18} />
              Add a site
            </button>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#718276]">Total sites</span>
                <House size={19} className="text-[#43865A]" />
              </div>
              <p className="mt-3 text-3xl font-semibold">{sites.length}</p>
              <p className="mt-2 text-xs text-[#94A397]">
                In this workspace
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#718276]">Combined solar</span>
                <Sun size={19} className="text-[#43865A]" />
              </div>
              <p className="mt-3 text-3xl font-semibold">
                {sites
                  .reduce((total, site) => total + site.solarCapacity, 0)
                  .toFixed(1)}
                <span className="ml-1 text-base font-medium text-[#718276]">
                  kW
                </span>
              </p>
              <p className="mt-2 text-xs text-[#94A397]">
                User-entered capacity
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#718276]">
                  Estimated daily usage
                </span>
                <Zap size={19} className="text-[#43865A]" />
              </div>
              <p className="mt-3 text-3xl font-semibold">
                {sites
                  .reduce((total, site) => total + site.dailyUsage, 0)
                  .toFixed(1)}
                <span className="ml-1 text-base font-medium text-[#718276]">
                  kWh
                </span>
              </p>
              <p className="mt-2 text-xs text-[#94A397]">
                Combined user estimates
              </p>
            </div>
          </section>

          {message && !showForm && (
            <div
              role="status"
              className="flex items-start justify-between gap-3 rounded-xl bg-[#E7F1E5] p-4 text-sm text-[#315A40]"
            >
              <span>{message}</span>
              <button
                onClick={() => setMessage('')}
                aria-label="Dismiss message"
                className="shrink-0"
              >
                <X size={17} />
              </button>
            </div>
          )}

          <section className="grid items-start gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-semibold">Your sites</h3>
                  <p className="mt-1 text-xs text-[#718276]">
                    Select a site to make it your active workspace.
                  </p>
                </div>

                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A397]"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search sites..."
                    aria-label="Search sites"
                    className="w-full rounded-xl border border-[#DCE6D9] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#43865A] sm:w-56"
                  />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {loading && (
                  <p className="py-6 text-center text-sm text-[#718276]">
                    Loading your sites...
                  </p>
                )}

                {!loading &&
                  filteredSites.map((site) => (
                    <div
                      key={site.id}
                      className={`rounded-2xl border p-4 transition ${
                        selectedId === site.id
                          ? 'border-[#43865A] bg-[#F7FAF6] ring-2 ring-[#43865A]/10'
                          : 'border-[#E4ECE1] hover:border-[#C8D9C5]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => selectSite(site.id)}
                          aria-label={`Select ${site.name}`}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]"
                        >
                          {site.type === 'Apartment' ? (
                            <House size={23} />
                          ) : (
                            <Sun size={23} />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => selectSite(site.id)}
                            className="text-left text-sm font-semibold hover:text-[#43865A]"
                          >
                            {site.name}
                          </button>

                          <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-[#718276]">
                            <MapPin size={13} className="mt-0.5 shrink-0" />
                            {site.location}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-lg bg-[#F0F4EF] px-2.5 py-1 text-xs text-[#526F5A]">
                              {site.type}
                            </span>

                            {site.isPrimary && (
                              <span className="rounded-lg bg-[#E7F1E5] px-2.5 py-1 text-xs font-medium text-[#315A40]">
                                Primary site
                              </span>
                            )}

                            {selectedId === site.id && (
                              <span className="rounded-lg bg-[#E7F1E5] px-2.5 py-1 text-xs font-medium text-[#315A40]">
                                Active
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => openEditForm(site)}
                            aria-label={`Edit ${site.name}`}
                            disabled={actionLoadingId !== null}
                            className="rounded-lg p-2 text-[#718276] hover:bg-[#E7F1E5] hover:text-[#315A40] disabled:opacity-50"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => void deleteSite(site)}
                            aria-label={`Delete ${site.name}`}
                            disabled={actionLoadingId !== null}
                            className="rounded-lg p-2 text-[#718276] hover:bg-[#FBEDE7] hover:text-[#A45D43] disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#E8EEE6] pt-4">
                        <div>
                          <p className="text-xs text-[#718276]">
                            Solar capacity
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {site.solarCapacity} kW
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[#718276]">
                            Daily usage estimate
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {site.dailyUsage} kWh
                          </p>
                        </div>
                      </div>

                      {!site.isPrimary && (
                        <button
                          onClick={() => void makePrimary(site.id)}
                          disabled={actionLoadingId !== null}
                          className="mt-3 text-xs font-semibold text-[#43865A] hover:text-[#244A35] disabled:opacity-50"
                        >
                          {actionLoadingId === site.id
                            ? 'Updating...'
                            : 'Make primary site'}
                        </button>
                      )}
                    </div>
                  ))}

                {!loading && filteredSites.length === 0 && sites.length > 0 && (
                  <div className="rounded-xl border border-dashed border-[#DCE6D9] px-4 py-10 text-center">
                    <Search size={24} className="mx-auto text-[#94A397]" />
                    <p className="mt-3 text-sm font-medium">No sites found</p>
                    <p className="mt-1 text-xs text-[#718276]">
                      Try another search or add a new site.
                    </p>
                  </div>
                )}

                {!loading && sites.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[#DCE6D9] px-4 py-10 text-center">
                    <House size={25} className="mx-auto text-[#94A397]" />
                    <p className="mt-3 text-sm font-medium">
                      No sites added yet
                    </p>
                    <p className="mt-1 text-xs text-[#718276]">
                      Add a site to start organizing your energy data.
                    </p>
                    <button
                      onClick={openAddForm}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#43865A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#36734B]"
                    >
                      <Plus size={16} />
                      Add your first site
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Active site</h3>
                  <span className="rounded-full bg-[#E7F1E5] px-3 py-1 text-xs font-medium text-[#315A40]">
                    Selected
                  </span>
                </div>

                {selectedSite ? (
                  <>
                    <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7F1E5] text-[#43865A]">
                      <House size={27} />
                    </div>

                    <h4 className="mt-4 text-lg font-semibold">
                      {selectedSite.name}
                    </h4>

                    <p className="mt-1 flex items-start gap-1.5 text-sm leading-6 text-[#718276]">
                      <MapPin size={15} className="mt-1 shrink-0" />
                      {selectedSite.location}
                    </p>

                    <div className="mt-5 space-y-3">
                      <div className="flex items-center justify-between rounded-xl bg-[#F4F8F3] p-3">
                        <span className="text-xs text-[#718276]">
                          Property
                        </span>
                        <span className="text-sm font-medium">
                          {selectedSite.type}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-[#F4F8F3] p-3">
                        <span className="text-xs text-[#718276]">
                          Solar system
                        </span>
                        <span className="text-sm font-medium">
                          {selectedSite.solarCapacity} kW
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-[#F4F8F3] p-3">
                        <span className="text-xs text-[#718276]">
                          Daily demand
                        </span>
                        <span className="text-sm font-medium">
                          {selectedSite.dailyUsage} kWh
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => openEditForm(selectedSite)}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#DCE6D9] px-4 py-3 text-sm font-semibold text-[#315A40] hover:bg-[#F4F8F3]"
                    >
                      <Pencil size={16} />
                      Edit active site
                    </button>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <House size={28} className="mx-auto text-[#94A397]" />
                    <p className="mt-3 text-sm text-[#718276]">
                      {loading ? 'Loading active site...' : 'No active site yet.'}
                    </p>
                    {!loading && (
                      <button
                        onClick={openAddForm}
                        className="mt-4 rounded-xl bg-[#43865A] px-4 py-2.5 text-sm font-semibold text-white"
                      >
                        Add a site
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[#DCE6D9] bg-[#E7F1E5] p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#43865A]">
                  <Leaf size={21} />
                </span>

                <h3 className="mt-4 font-semibold">Site-specific insights</h3>

                <p className="mt-2 text-sm leading-6 text-[#526F5A]">
                  Each site stores its own location, solar capacity, and daily
                  usage estimate. Forecasts and optimization still depend on
                  the data accepted by their respective backend endpoints.
                </p>

                <Link
                  to="/solar"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#36734B] hover:text-[#244A35]"
                >
                  View solar forecast <ArrowRight size={16} />
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#193326]/40 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-form-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#43865A]">
                  Site details
                </p>
                <h3 id="site-form-title" className="mt-2 text-xl font-semibold">
                  {editingId !== null ? 'Edit site' : 'Add a new site'}
                </h3>
                <p className="mt-1 text-sm text-[#718276]">
                  Enter the basic details for this location.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!saving) {
                    setShowForm(false)
                    setMessage('')
                  }
                }}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg p-2 text-[#718276] hover:bg-[#F4F8F3] disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {message && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#FBEDE7] p-3 text-sm text-[#A45D43]"
                >
                  {message}
                </p>
              )}

              <div>
                <label
                  htmlFor="siteName"
                  className="mb-2 block text-sm font-medium"
                >
                  Site name
                </label>
                <input
                  id="siteName"
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. My Home"
                  className="w-full rounded-xl border border-[#DCE6D9] px-4 py-3 text-sm outline-none focus:border-[#43865A]"
                />
              </div>

              <div>
                <label
                  htmlFor="siteLocation"
                  className="mb-2 block text-sm font-medium"
                >
                  Location
                </label>
                <input
                  id="siteLocation"
                  required
                  maxLength={150}
                  value={form.location}
                  onChange={(event) =>
                    setForm({ ...form, location: event.target.value })
                  }
                  placeholder="City, region or address"
                  className="w-full rounded-xl border border-[#DCE6D9] px-4 py-3 text-sm outline-none focus:border-[#43865A]"
                />
              </div>

              <div>
                <label
                  htmlFor="siteType"
                  className="mb-2 block text-sm font-medium"
                >
                  Property type
                </label>
                <select
                  id="siteType"
                  value={form.type}
                  onChange={(event) =>
                    setForm({ ...form, type: event.target.value })
                  }
                  className="w-full rounded-xl border border-[#DCE6D9] bg-white px-4 py-3 text-sm outline-none focus:border-[#43865A]"
                >
                  <option>House</option>
                  <option>Apartment</option>
                  <option>Small business</option>
                  <option>School</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="siteSolar"
                    className="mb-2 block text-sm font-medium"
                  >
                    Solar capacity (kW)
                  </label>
                  <input
                    id="siteSolar"
                    type="number"
                    required
                    min="0"
                    max="100000"
                    step="0.1"
                    value={form.solarCapacity}
                    onChange={(event) =>
                      setForm({ ...form, solarCapacity: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#DCE6D9] px-4 py-3 text-sm outline-none focus:border-[#43865A]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="siteUsage"
                    className="mb-2 block text-sm font-medium"
                  >
                    Daily usage (kWh)
                  </label>
                  <input
                    id="siteUsage"
                    type="number"
                    required
                    min="0"
                    max="1000000"
                    step="0.1"
                    value={form.dailyUsage}
                    onChange={(event) =>
                      setForm({ ...form, dailyUsage: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#DCE6D9] px-4 py-3 text-sm outline-none focus:border-[#43865A]"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!saving) {
                      setShowForm(false)
                      setMessage('')
                    }
                  }}
                  disabled={saving}
                  className="rounded-xl border border-[#DCE6D9] px-5 py-3 text-sm font-semibold text-[#526F5A] hover:bg-[#F4F8F3] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#36734B] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check size={17} />
                  {saving
                    ? 'Saving...'
                    : editingId !== null
                      ? 'Save changes'
                      : 'Add site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
