
import { useCallback, useEffect, useState } from 'react'
import { getDevices, getSites } from '../services/api'
import { chooseActiveSite, getActiveSiteId } from '../services/activeSite'
import type { Device, Site } from '../services/api'

export function useActiveSiteData() {
  const [sites, setSites] = useState<Site[]>([])
  const [activeSite, setActiveSite] = useState<Site | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSites = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getSites()
      setSites(result)

      const selected = chooseActiveSite(result)
      setActiveSite(selected)

      if (!selected) {
        setDevices([])
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load sites.',
      )
      setActiveSite(null)
      setDevices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSites()

    const handleSiteChange = () => {
      void loadSites()
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
  }, [loadSites])

  useEffect(() => {
    if (!activeSite) {
      setDevices([])
      return
    }

    let cancelled = false

    async function loadSiteDevices() {
      try {
        const result = await getDevices(activeSite!.id)
        if (!cancelled) setDevices(result)
      } catch (err) {
        if (!cancelled) {
          setDevices([])
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load devices.',
          )
        }
      }
    }

    void loadSiteDevices()

    return () => {
      cancelled = true
    }
  }, [activeSite])

  return {
    sites,
    activeSite,
    devices,
    loading,
    error,
    refresh: loadSites,
    savedActiveSiteId: getActiveSiteId(),
  }
}
