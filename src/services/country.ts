/**
 * Automatically detects the visitor's country without manual input.
 * 1. Queries https://api.country.is/ (instant, CORS-friendly, free)
 * 2. Formats ISO country code (e.g. "IN") to full country name ("India") via Intl.DisplayNames
 * 3. Falls back to browser timezone (e.g. Asia/Kolkata -> India) if offline
 */
export async function detectCountry(): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2500)

    const res = await fetch('https://api.country.is/', {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (res.ok) {
      const data = await res.json()
      if (data?.country) {
        const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
        const fullName = regionNames.of(data.country)
        if (fullName) return fullName
      }
    }
  } catch {
    // Network or timeout failure - fall through to timezone heuristic
  }

  // Fallback via browser timezone
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.includes('Kolkata') || tz.includes('Calcutta')) return 'India'
    if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago')) return 'United States'
    if (tz.includes('London')) return 'United Kingdom'
    if (tz.includes('Dubai')) return 'United Arab Emirates'
    if (tz.includes('Singapore')) return 'Singapore'
    if (tz.includes('Toronto')) return 'Canada'
    if (tz.includes('Sydney') || tz.includes('Melbourne')) return 'Australia'

    // Return the timezone region prefix (e.g. Europe, Asia, America)
    const parts = tz.split('/')
    if (parts.length > 1) {
      return parts[1].replace(/_/g, ' ')
    }
    return tz || 'Unknown'
  } catch {
    return 'Unknown'
  }
}
