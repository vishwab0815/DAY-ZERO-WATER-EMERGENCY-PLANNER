import axios from 'axios'
import type { HouseholdProfile, SimulationResult, Alternative, CityData, Crisis, GeocodeResult } from '../types'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: BASE, timeout: 90000 })

export async function quickSimulate(profile: HouseholdProfile): Promise<SimulationResult> {
  const { data } = await api.post('/api/simulate/quick', profile)
  return data
}

export async function getCities(): Promise<{ cities: CityData[] }> {
  const { data } = await api.get('/api/cities')
  return data
}

export async function getCity(cityId: string): Promise<CityData> {
  const { data } = await api.get(`/api/cities/${cityId}`)
  return data
}

export async function getCrises(): Promise<{ crises: Crisis[] }> {
  const { data } = await api.get('/api/crises')
  return data
}

export async function getAlternatives(cityId: string, crisisDay = 0): Promise<Alternative[]> {
  const { data } = await api.get(`/api/alternatives/${cityId}`, { params: { crisis_day: crisisDay } })
  return data
}

export async function getPreparedness(householdId: string) {
  const { data } = await api.get(`/api/preparedness/${householdId}`)
  return data
}

export async function geocodeCity(query: string): Promise<{ results: GeocodeResult[] }> {
  const { data } = await api.get('/api/geocode', { params: { q: query }, timeout: 10000 })
  return data
}

export async function getLiveWeather(cityId: string): Promise<{ temp_c: number; forecast_7d: number[] }> {
  const { data } = await api.get(`/api/weather/${cityId}`, { timeout: 10000 })
  return data
}

export async function getLiveWeatherByCoords(lat: number, lon: number): Promise<{ temp_c: number; forecast_7d: number[] }> {
  const { data } = await api.get('/api/weather/coords/live', { params: { lat, lon }, timeout: 10000 })
  return data
}

export interface AIInsightsPayload {
  days_remaining: number
  crisis_level: string
  prep_score: number
  daily_consumption: number
  total_storage: number
  city: string
  members: number
  dehydration_risk: number
  hygiene_score: number
  rationing_level: string
  live_temp?: number
}

export interface AIInsightsResponse {
  insights: string
  crisis_level: string
  grounded: boolean
  sources: { title: string; uri: string }[]
}

export async function getAIInsights(payload: AIInsightsPayload): Promise<AIInsightsResponse> {
  const { data } = await api.post('/api/ai/insights', payload, { timeout: 30000 })
  return data
}

export async function testAI(): Promise<{ status: string; gemini?: string }> {
  const { data } = await api.get('/api/ai/test', { timeout: 15000 })
  return data
}

export interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

export interface ChatContext {
  city?: string
  days_remaining?: number
  crisis_level?: string
  members?: number
  live_temp?: number
  daily_consumption?: number
  total_storage?: number
}

export async function sendChatMessage(
  messages: ChatMessage[],
  context: ChatContext
): Promise<{ reply: string; grounded: boolean }> {
  const { data } = await api.post('/api/ai/chat', { messages, context }, { timeout: 28000 })
  return data
}
