import "server-only";

// Simple in-memory cache with TTL
const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// USGS Earthquakes
// ---------------------------------------------------------------------------

export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  latitude: number;
  longitude: number;
  depth: number;
  url: string;
  tsunami: boolean;
}

export async function fetchEarthquakes(
  minMagnitude = 4.5,
  period: "hour" | "day" | "week" | "month" = "week",
): Promise<Earthquake[]> {
  const cacheKey = `earthquakes:${minMagnitude}:${period}`;
  const cached = getCached<Earthquake[]>(cacheKey);
  if (cached) return cached;

  try {
    const magnitudeParam =
      minMagnitude >= 4.5 ? "significant" : minMagnitude >= 2.5 ? "2.5" : "all";
    const url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${magnitudeParam}_${period}.geojson`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      features: Array<{
        id: string;
        properties: {
          mag: number;
          place: string;
          time: number;
          url: string;
          tsunami: number;
        };
        geometry: { coordinates: [number, number, number] };
      }>;
    };

    const earthquakes: Earthquake[] = data.features.map((f) => ({
      id: f.id,
      magnitude: f.properties.mag,
      place: f.properties.place ?? "Unknown",
      time: f.properties.time,
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
      depth: f.geometry.coordinates[2],
      url: f.properties.url,
      tsunami: f.properties.tsunami === 1,
    }));

    setCache(cacheKey, earthquakes, CACHE_TTL);
    return earthquakes;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// ReliefWeb Reports
// ---------------------------------------------------------------------------

export interface ReliefWebReport {
  id: number;
  title: string;
  url: string;
  source: string;
  date: string;
  country: string;
  theme: string | null;
}

export async function fetchReliefWebReports(
  country?: string,
  limit = 20,
): Promise<ReliefWebReport[]> {
  const cacheKey = `reliefweb:${country ?? "all"}:${limit}`;
  const cached = getCached<ReliefWebReport[]>(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      appname: "clear-mvp",
      "fields[include][]": "title,url,source,date.original,country,theme",
      limit: String(limit),
      sort: "date.original:desc",
    });
    if (country) {
      params.append("filter[field]", "country.name");
      params.append("filter[value]", country);
    }

    const res = await fetch(
      `https://api.reliefweb.int/v1/reports?${params.toString()}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return [];

    const data = (await res.json()) as {
      data: Array<{
        id: number;
        fields: {
          title: string;
          url: string;
          source?: Array<{ name: string }>;
          date?: { original: string };
          country?: Array<{ name: string }>;
          theme?: Array<{ name: string }>;
        };
      }>;
    };

    const reports: ReliefWebReport[] = data.data.map((item) => ({
      id: item.id,
      title: item.fields.title,
      url: item.fields.url,
      source: item.fields.source?.[0]?.name ?? "Unknown",
      date: item.fields.date?.original ?? "",
      country: item.fields.country?.[0]?.name ?? "Unknown",
      theme: item.fields.theme?.[0]?.name ?? null,
    }));

    setCache(cacheKey, reports, CACHE_TTL);
    return reports;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Open-Meteo Weather
// ---------------------------------------------------------------------------

export interface WeatherData {
  latitude: number;
  longitude: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  weatherDescription: string;
  precipitation: number;
}

const weatherCodeDescriptions: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snowfall",
  73: "Moderate snowfall",
  75: "Heavy snowfall",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export async function fetchWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherData | null> {
  const cacheKey = `weather:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
  const cached = getCached<WeatherData>(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation",
    });

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      latitude: number;
      longitude: number;
      current: {
        temperature_2m: number;
        relative_humidity_2m: number;
        wind_speed_10m: number;
        weather_code: number;
        precipitation: number;
      };
    };

    const weather: WeatherData = {
      latitude: data.latitude,
      longitude: data.longitude,
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      weatherCode: data.current.weather_code,
      weatherDescription:
        weatherCodeDescriptions[data.current.weather_code] ?? "Unknown",
      precipitation: data.current.precipitation,
    };

    setCache(cacheKey, weather, CACHE_TTL);
    return weather;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Feed Status (aggregate)
// ---------------------------------------------------------------------------

export interface FeedStatus {
  name: string;
  status: "online" | "error";
  lastChecked: string;
  recordCount?: number;
}

export async function checkFeedStatus(): Promise<FeedStatus[]> {
  const cacheKey = "feed-status";
  const cached = getCached<FeedStatus[]>(cacheKey);
  if (cached) return cached;

  const now = new Date().toISOString();

  const results = await Promise.allSettled([
    fetchEarthquakes(4.5, "day"),
    fetchReliefWebReports(undefined, 1),
    fetchWeather(0, 0),
  ]);

  const statuses: FeedStatus[] = [
    {
      name: "USGS Earthquakes",
      status: results[0]?.status === "fulfilled" ? "online" : "error",
      lastChecked: now,
      recordCount:
        results[0]?.status === "fulfilled" ? results[0].value.length : 0,
    },
    {
      name: "ReliefWeb Reports",
      status: results[1]?.status === "fulfilled" ? "online" : "error",
      lastChecked: now,
      recordCount:
        results[1]?.status === "fulfilled" ? results[1].value.length : 0,
    },
    {
      name: "Open-Meteo Weather",
      status: results[2]?.status === "fulfilled" && results[2].value != null ? "online" : "error",
      lastChecked: now,
    },
  ];

  setCache(cacheKey, statuses, 60 * 1000); // 1 min cache for status
  return statuses;
}
