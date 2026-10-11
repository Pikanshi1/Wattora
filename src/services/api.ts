
const API_BASE_URL = 'http://127.0.0.1:8000'

// Solar prediction
export interface SolarPredictionInput {
  plant_id: number
  site_id?: number
  ambient_temperature: number
  module_temperature: number
  irradiation: number
  hour: number
  day_of_year: number
  month: number
}

export interface SolarPredictionResult {
  predicted_power: number
  target: string
  unit: string
  model: string
  site_id?: number
  site_solar_capacity_kw?: number | null
}

// Energy-demand prediction
export interface EnergyPredictionInput {
  hour: number
  day_of_week: number
  day_of_year: number
  month: number
  is_weekend: number
  lag_1h: number
  lag_24h: number
  lag_168h: number
}

export interface EnergyPredictionResult {
  predicted_demand: number
  target: string
  unit: string
  model: string
}

// Energy optimization
export interface OptimizationResult {
  solar_generation_kw: number
  demand_kw: number
  surplus_kw: number
  grid_required_kw: number
  self_consumption_percent: number
  status: 'solar_surplus' | 'energy_deficit' | 'balanced'
  recommendation: string
}

// Site management
export interface Site {
  id: number
  name: string
  location: string
  type: string
  solar_capacity: number
  daily_usage: number
  is_primary: boolean
}

export interface SiteInput {
  name: string
  location: string
  type: string
  solar_capacity: number
  daily_usage: number
}

// Device management
export type DeviceCategory = 'Appliances' | 'Climate' | 'Other'

export interface Device {
  id: number
  site_id: number
  name: string
  category: DeviceCategory
  power: number
  hours: number
  flexible: boolean
  enabled: boolean
}

export interface DeviceInput {
  site_id: number
  name: string
  category: DeviceCategory
  power: number
  hours: number
  flexible: boolean
  enabled?: boolean
}

// Shared API error handling
function connectionError(): Error {
  return new Error(
    'Cannot connect to Wattora API. Make sure the FastAPI server is running.',
  )
}

async function readError(response: Response): Promise<Error> {
  const body = await response.text()
  return new Error(`API error (${response.status}): ${body}`)
}

async function post<T>(endpoint: string, data: unknown): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch {
    throw connectionError()
  }

  if (!response.ok) throw await readError(response)

  return response.json() as Promise<T>
}

async function put<T>(endpoint: string, data: unknown): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch {
    throw connectionError()
  }

  if (!response.ok) throw await readError(response)
  if (response.status === 204) return {} as T

  return response.json() as Promise<T>
}

async function patch<T>(endpoint: string, data?: unknown): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      ...(data !== undefined
        ? {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        : {}),
    })
  } catch {
    throw connectionError()
  }

  if (!response.ok) throw await readError(response)
  if (response.status === 204) return {} as T

  return response.json() as Promise<T>
}

async function remove(endpoint: string): Promise<void> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
    })
  } catch {
    throw connectionError()
  }

  if (!response.ok) throw await readError(response)
}

async function get<T>(endpoint: string): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`)
  } catch {
    throw connectionError()
  }

  if (!response.ok) throw await readError(response)

  return response.json() as Promise<T>
}

// Prediction API functions
export function predictSolar(
  input: SolarPredictionInput,
): Promise<SolarPredictionResult> {
  return post<SolarPredictionResult>('/api/solar/predict', input)
}

export function predictEnergy(
  input: EnergyPredictionInput,
): Promise<EnergyPredictionResult> {
  return post<EnergyPredictionResult>('/api/energy/predict', input)
}

export function optimizeEnergy(
  solarPowerW: number,
  demandKw: number,
): Promise<OptimizationResult> {
  return post<OptimizationResult>('/api/optimizer/analyze', {
    solar_power_w: solarPowerW,
    demand_kw: demandKw,
  })
}

// Site API functions
export async function getSites(): Promise<Site[]> {
  return get<Site[]>('/api/sites')
}

export async function createSite(input: SiteInput): Promise<Site> {
  return post<Site>('/api/sites', input)
}

export async function updateSite(
  id: number,
  input: SiteInput,
): Promise<Site> {
  return put<Site>(`/api/sites/${id}`, input)
}

export async function deleteSite(id: number): Promise<void> {
  await remove(`/api/sites/${id}`)
}

export async function setPrimarySite(id: number): Promise<Site> {
  return patch<Site>(`/api/sites/${id}/primary`)
}

// Device API functions
export async function getDevices(siteId: number): Promise<Device[]> {
  return get<Device[]>(`/api/devices?site_id=${encodeURIComponent(siteId)}`)
}

export async function createDevice(input: DeviceInput): Promise<Device> {
  return post<Device>('/api/devices', input)
}

export async function updateDevice(
  deviceId: number,
  input: DeviceInput,
): Promise<Device> {
  return put<Device>(`/api/devices/${deviceId}`, input)
}

export async function setDeviceEnabled(
  deviceId: number,
  enabled: boolean,
): Promise<Device> {
  return patch<Device>(`/api/devices/${deviceId}`, { enabled })
}

export async function deleteDevice(deviceId: number): Promise<void> {
  await remove(`/api/devices/${deviceId}`)
}
