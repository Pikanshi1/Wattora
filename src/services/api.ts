
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
).replace(/\/+$/, '')



export interface AuthUser {
  id: number
  full_name: string
  email: string
}

interface AuthResponse {
  access_token: string
  token_type: string
  user: AuthUser
}

export interface RegistrationResponse {
  email: string
  email_sent: boolean
  verification_required: boolean
  message: string
}

export interface UserProfile extends AuthUser {
  location: string
  home_type: string
  solar_capacity: number
  electricity_rate: number
  energy_unit: string
  currency: string
}

export interface UserPreferences {
  solar_alerts: boolean
  demand_alerts: boolean
  high_usage_alerts: boolean
  weekly_summary: boolean
  forecast_horizon: number
  forecast_interval: 'hourly' | 'daily'
  optimization_priority: 'savings' | 'balanced' | 'solar'
  battery_reserve: number
}

const TOKEN_KEY = 'wattora.accessToken'

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function logoutUser(): void {
  localStorage.removeItem(TOKEN_KEY)
}

async function authRequest<T>(
  endpoint: string,
  data: unknown,
): Promise<T> {
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

export async function registerUser(input: {
  full_name: string
  email: string
  password: string
}): Promise<RegistrationResponse> {
  return authRequest<RegistrationResponse>('/api/auth/register', input)
}

export function verifyEmail(input: {
  email: string
  code: string
}): Promise<{ message: string }> {
  return authRequest('/api/auth/verify-email', input)
}

export function resendVerification(email: string): Promise<{ message: string }> {
  return authRequest('/api/auth/resend-verification', { email })
}

export function requestPasswordReset(email: string): Promise<{ message: string }> {
  return authRequest('/api/auth/password/forgot', { email })
}

export function resetPassword(input: {
  token: string
  password: string
}): Promise<{ message: string }> {
  return authRequest('/api/auth/password/reset', input)
}

export async function loginUser(input: {
  email: string
  password: string
}): Promise<AuthResponse> {
  const result = await authRequest<AuthResponse>(
    '/api/auth/login',
    input,
  )
  localStorage.setItem(TOKEN_KEY, result.access_token)
  return result
}

export async function getUserProfile(): Promise<UserProfile> {
  const token = getAccessToken()
  if (!token) throw new Error('Please sign in to continue.')

  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    if (response.status === 401) logoutUser()
    throw await readError(response)
  }

  return response.json() as Promise<UserProfile>
}

export async function saveUserProfile(
  input: Omit<UserProfile, 'id' | 'email'>,
): Promise<UserProfile> {
  const token = getAccessToken()
  if (!token) throw new Error('Please sign in to continue.')

  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    if (response.status === 401) logoutUser()
    throw await readError(response)
  }

  return response.json() as Promise<UserProfile>
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const token = getAccessToken()
  if (!token) throw new Error('Please sign in to continue.')

  const response = await fetch(`${API_BASE_URL}/api/auth/preferences`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    if (response.status === 401) logoutUser()
    throw await readError(response)
  }

  return response.json() as Promise<UserPreferences>
}

export async function saveUserPreferences(
  input: UserPreferences,
): Promise<UserPreferences> {
  const token = getAccessToken()
  if (!token) throw new Error('Please sign in to continue.')

  const response = await fetch(`${API_BASE_URL}/api/auth/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    if (response.status === 401) logoutUser()
    throw await readError(response)
  }

  return response.json() as Promise<UserPreferences>
}


// Solar prediction
export interface SolarPredictionInput {
  plant_id: number
  site_id: number
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
  site_id: number
  hour: number
  day_of_week: number
  day_of_year: number
  month: number
  is_weekend: number
}

export interface EnergyPredictionResult {
  predicted_demand: number
  target: string
  unit: string
  model: string
  site_id: number
  personalized_daily_usage_kwh: number
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
  site_id: number
  optimization_priority: 'savings' | 'balanced' | 'solar'
  battery_reserve: number
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
  let detail = body

  try {
    const parsed: unknown = JSON.parse(body)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'detail' in parsed &&
      typeof parsed.detail === 'string'
    ) {
      detail = parsed.detail
    }
  } catch {
    // Non-JSON responses are reported as-is.
  }

  return new Error(detail || `API request failed (${response.status}).`)
}

function authenticatedHeaders(json = false): HeadersInit {
  const token = getAccessToken()
  if (!token) throw new Error('Please sign in to continue.')

  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${token}`,
  }
}

function handleUnauthorized(response: Response): void {
  if (response.status === 401) logoutUser()
}

async function post<T>(endpoint: string, data: unknown): Promise<T> {
  const headers = authenticatedHeaders(true)
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })
  } catch {
    throw connectionError()
  }

  if (!response.ok) {
    handleUnauthorized(response)
    throw await readError(response)
  }

  return response.json() as Promise<T>
}

async function put<T>(endpoint: string, data: unknown): Promise<T> {
  const headers = authenticatedHeaders(true)
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    })
  } catch {
    throw connectionError()
  }

  if (!response.ok) {
    handleUnauthorized(response)
    throw await readError(response)
  }
  if (response.status === 204) return {} as T

  return response.json() as Promise<T>
}

async function patch<T>(endpoint: string, data?: unknown): Promise<T> {
  const headers = authenticatedHeaders(data !== undefined)
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      ...(data !== undefined
        ? {
            headers,
            body: JSON.stringify(data),
          }
        : { headers }),
    })
  } catch {
    throw connectionError()
  }

  if (!response.ok) {
    handleUnauthorized(response)
    throw await readError(response)
  }
  if (response.status === 204) return {} as T

  return response.json() as Promise<T>
}

async function remove(endpoint: string): Promise<void> {
  const headers = authenticatedHeaders()
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    })
  } catch {
    throw connectionError()
  }

  if (!response.ok) {
    handleUnauthorized(response)
    throw await readError(response)
  }
}

async function get<T>(endpoint: string): Promise<T> {
  const headers = authenticatedHeaders()
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers,
    })
  } catch {
    throw connectionError()
  }

  if (!response.ok) {
    handleUnauthorized(response)
    throw await readError(response)
  }

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
  siteId: number,
  solarPowerW: number,
): Promise<OptimizationResult> {
  return post<OptimizationResult>('/api/optimizer/analyze', {
    site_id: siteId,
    solar_power_w: solarPowerW,
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
