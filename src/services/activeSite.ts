import type { Site } from './api'

const ACTIVE_SITE_KEY = 'wattora.activeSiteId'

export function getActiveSiteId(): number | null {
  try {
    const value = localStorage.getItem(ACTIVE_SITE_KEY)

    if (value === null) return null

    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export function setActiveSiteId(id: number): void {
  try {
    localStorage.setItem(ACTIVE_SITE_KEY, String(id))
    window.dispatchEvent(new Event('wattora:active-site-changed'))
  } catch {
    // The page can still work when browser storage is unavailable.
  }
}

export function chooseActiveSite<T extends Site>(sites: T[]): T | null {
  if (sites.length === 0) return null

  const savedId = getActiveSiteId()

  return (
    sites.find((site) => site.id === savedId) ??
    sites.find((site) => site.is_primary) ??
    sites[0]
  )
}
