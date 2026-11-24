/**
 * Automatically detects the visitor's country without manual input.
 * 1. Checks memory cache (0ms instant response)
 * 2. Primary: https://api.country.is/ (CORS-friendly, lightweight)
 * 3. Secondary: https://freeipapi.com/api/json (backup geolocation API)
 * 4. Fallback: Browser timezone & Intl.DisplayNames (offline-safe)
 */

let cachedCountry: string | null = null

export async function detectCountry(): Promise<string> {
  if (cachedCountry) {
    return cachedCountry
  }

  // 1. Try Primary Geolocation API
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)

    const res = await fetch('https://api.country.is/', { signal: controller.signal })
    clearTimeout(timeout)

    if (res.ok) {
      const data = await res.json()
      if (data?.country) {
        const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
        const fullName = regionNames.of(data.country)
        if (fullName) {
          cachedCountry = fullName
          return fullName
        }
      }
    }
  } catch {
    // Fall through to backup
  }

  // 2. Try Secondary Geolocation API (backup)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)

    const res = await fetch('https://freeipapi.com/api/json', { signal: controller.signal })
    clearTimeout(timeout)

    if (res.ok) {
      const data = await res.json()
      if (data?.countryName) {
        cachedCountry = data.countryName
        return data.countryName
      }
    }
  } catch {
    // Fall through to timezone
  }

  // 3. Fallback via browser timezone & locale heuristics (offline-safe)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.includes('Kolkata') || tz.includes('Calcutta')) cachedCountry = 'India'
    else if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago')) cachedCountry = 'United States'
    else if (tz.includes('London')) cachedCountry = 'United Kingdom'
    else if (tz.includes('Dubai')) cachedCountry = 'United Arab Emirates'
    else if (tz.includes('Singapore')) cachedCountry = 'Singapore'
    else if (tz.includes('Toronto')) cachedCountry = 'Canada'
    else if (tz.includes('Sydney') || tz.includes('Melbourne')) cachedCountry = 'Australia'
    else if (tz.includes('Berlin') || tz.includes('Frankfurt')) cachedCountry = 'Germany'
    else if (tz.includes('Paris')) cachedCountry = 'France'
    else if (tz.includes('Tokyo')) cachedCountry = 'Japan'
    else {
      const parts = tz.split('/')
      cachedCountry = parts.length > 1 ? parts[1].replace(/_/g, ' ') : tz || 'Global'
    }
    return cachedCountry
  } catch {
    return 'Global'
  }
}

// Preload country on module load
detectCountry().catch(() => {})
