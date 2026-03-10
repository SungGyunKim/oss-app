import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export interface NotificationSettings {
  showToast: boolean
}

export interface Settings {
  notification: NotificationSettings
}

const DEFAULTS: Settings = {
  notification: {
    showToast: true
  }
}

const filePath = path.join(app.getPath('userData'), 'settings.json')

let cache: Settings | null = null

function deepMerge<T extends Record<string, unknown>>(base: T, override: Record<string, unknown>): T {
  const result = { ...base } as Record<string, unknown>
  for (const key of Object.keys(override)) {
    const baseVal = result[key]
    const overVal = override[key]
    if (
      baseVal &&
      overVal &&
      typeof baseVal === 'object' &&
      typeof overVal === 'object' &&
      !Array.isArray(baseVal) &&
      !Array.isArray(overVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overVal as Record<string, unknown>
      )
    } else {
      result[key] = overVal
    }
  }
  return result as T
}

function read(): Settings {
  if (cache) return cache
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    cache = deepMerge(DEFAULTS, JSON.parse(raw))
  } catch {
    cache = { ...DEFAULTS }
  }
  return cache
}

function write(settings: Settings): void {
  cache = settings
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8')
}

export function getSettings(): Settings {
  return read()
}

export function updateSettings(partial: Partial<Settings>): Settings {
  const current = read()
  const updated = deepMerge(current, partial as Record<string, unknown>)
  write(updated)
  return updated
}
