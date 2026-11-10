import { logger } from '@/lib/logger';

export const EMSIFA_BASE_URL = 'https://www.emsifa.com/api-wilayah-indonesia/v2';

export interface Province {
  id: string;
  name: string;
  capital?: string;
  lat?: number;
  lng?: number;
}

export interface Regency {
  id: string;
  provinceId?: string;
  name: string;
  capital?: string;
  lat?: number;
  lng?: number;
}

export interface District {
  id: string;
  regencyId?: string;
  name: string;
  lat?: number;
  lng?: number;
}

export interface Village {
  id: string;
  districtId?: string;
  name: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
}

export interface PostalCodeLookupResult {
  postalCode: string;
  villageId: string;
  villageName: string;
  districtId: string;
  districtName: string;
  regencyId: string;
  regencyName: string;
  provinceId: string;
  provinceName: string;
  formattedAddress: string;
}

// In-memory cache to guarantee sub-millisecond response times for hot paths
const memoryCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getFromCache<T>(key: string): T | null {
  const cached = memoryCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }
  return null;
}

function setToCache(key: string, data: any): void {
  memoryCache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

// Fallback high-fidelity regional data for offline testing and air-gapped runtimes
const FALLBACK_PROVINCES: Province[] = [
  { id: '31', name: 'DKI Jakarta', capital: 'Jakarta Pusat' },
  { id: '32', name: 'Jawa Barat', capital: 'Bandung' },
  { id: '33', name: 'Jawa Tengah', capital: 'Semarang' },
  { id: '34', name: 'DI Yogyakarta', capital: 'Yogyakarta' },
  { id: '35', name: 'Jawa Timur', capital: 'Surabaya' },
  { id: '36', name: 'Banten', capital: 'Serang' },
  { id: '51', name: 'Bali', capital: 'Denpasar' },
  { id: '12', name: 'Sumatera Utara', capital: 'Medan' },
  { id: '73', name: 'Sulawesi Selatan', capital: 'Makassar' },
];

const FALLBACK_REGENCIES: Record<string, Regency[]> = {
  '31': [
    { id: '31.71', provinceId: '31', name: 'Kota Administrasi Jakarta Pusat' },
    { id: '31.74', provinceId: '31', name: 'Kota Administrasi Jakarta Selatan' },
    { id: '31.75', provinceId: '31', name: 'Kota Administrasi Jakarta Timur' },
    { id: '31.73', provinceId: '31', name: 'Kota Administrasi Jakarta Barat' },
    { id: '31.72', provinceId: '31', name: 'Kota Administrasi Jakarta Utara' },
  ],
  '35': [
    { id: '35.78', provinceId: '35', name: 'Kota Surabaya' },
    { id: '35.15', provinceId: '35', name: 'Kabupaten Sidoarjo' },
    { id: '35.73', provinceId: '35', name: 'Kota Malang' },
    { id: '35.25', provinceId: '35', name: 'Kabupaten Gresik' },
  ],
  '32': [
    { id: '32.73', provinceId: '32', name: 'Kota Bandung' },
    { id: '32.75', provinceId: '32', name: 'Kota Bekasi' },
    { id: '32.76', provinceId: '32', name: 'Kota Depok' },
    { id: '32.71', provinceId: '32', name: 'Kota Bogor' },
  ],
};

const FALLBACK_DISTRICTS: Record<string, District[]> = {
  '31.74': [
    { id: '31.74.07', regencyId: '31.74', name: 'Kebayoran Baru' },
    { id: '31.74.01', regencyId: '31.74', name: 'Tebet' },
    { id: '31.74.02', regencyId: '31.74', name: 'Setiabudi' },
    { id: '31.74.04', regencyId: '31.74', name: 'Pasar Minggu' },
    { id: '31.74.05', regencyId: '31.74', name: 'Cilandak' },
  ],
  '35.78': [
    { id: '35.78.08', regencyId: '35.78', name: 'Rungkut' },
    { id: '35.78.01', regencyId: '35.78', name: 'Genteng' },
    { id: '35.78.02', regencyId: '35.78', name: 'Tegalsari' },
    { id: '35.78.15', regencyId: '35.78', name: 'Wonokromo' },
    { id: '35.78.20', regencyId: '35.78', name: 'Sukolilo' },
  ],
};

const FALLBACK_VILLAGES: Record<string, Village[]> = {
  '31.74.07': [
    { id: '31.74.07.1004', districtId: '31.74.07', name: 'Selong', postalCode: '12110' },
    { id: '31.74.07.1005', districtId: '31.74.07', name: 'Melawai', postalCode: '12160' },
    { id: '31.74.07.1006', districtId: '31.74.07', name: 'Senayan', postalCode: '12190' },
  ],
  '31.74.01': [
    { id: '31.74.01.1001', districtId: '31.74.01', name: 'Tebet Timur', postalCode: '12820' },
    { id: '31.74.01.1002', districtId: '31.74.01', name: 'Tebet Barat', postalCode: '12810' },
    { id: '31.74.01.1003', districtId: '31.74.01', name: 'Menteng Dalam', postalCode: '12870' },
  ],
  '35.78.08': [
    { id: '35.78.08.1001', districtId: '35.78.08', name: 'Medokan Ayu', postalCode: '60295' },
    { id: '35.78.08.1002', districtId: '35.78.08', name: 'Rungkut Kidul', postalCode: '60293' },
    { id: '35.78.08.1003', districtId: '35.78.08', name: 'Kalirungkut', postalCode: '60293' },
  ],
};

const FALLBACK_POSTAL_CODES: Record<string, PostalCodeLookupResult[]> = {
  '12110': [
    {
      postalCode: '12110',
      villageId: '31.74.07.1004',
      villageName: 'Selong',
      districtId: '31.74.07',
      districtName: 'Kebayoran Baru',
      regencyId: '31.74',
      regencyName: 'Kota Administrasi Jakarta Selatan',
      provinceId: '31',
      provinceName: 'DKI Jakarta',
      formattedAddress: 'Selong, Kebayoran Baru, Kota Administrasi Jakarta Selatan, DKI Jakarta 12110',
    },
  ],
  '12820': [
    {
      postalCode: '12820',
      villageId: '31.74.01.1001',
      villageName: 'Tebet Timur',
      districtId: '31.74.01',
      districtName: 'Tebet',
      regencyId: '31.74',
      regencyName: 'Kota Administrasi Jakarta Selatan',
      provinceId: '31',
      provinceName: 'DKI Jakarta',
      formattedAddress: 'Tebet Timur, Tebet, Kota Administrasi Jakarta Selatan, DKI Jakarta 12820',
    },
  ],
  '60295': [
    {
      postalCode: '60295',
      villageId: '35.78.08.1001',
      villageName: 'Medokan Ayu',
      districtId: '35.78.08',
      districtName: 'Rungkut',
      regencyId: '35.78',
      regencyName: 'Kota Surabaya',
      provinceId: '35',
      provinceName: 'Jawa Timur',
      formattedAddress: 'Medokan Ayu, Rungkut, Kota Surabaya, Jawa Timur 60295',
    },
  ],
};

/**
 * Fetch all Indonesian provinces (Level 1).
 */
export async function getProvinces(): Promise<Province[]> {
  const cacheKey = 'regions:provinces';
  const cached = getFromCache<Province[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${EMSIFA_BASE_URL}/provinces.json`, {
      signal: AbortSignal.timeout(1200),
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const json = await res.json();
      const rawList = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      const list: Province[] = rawList.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        capital: item.capital,
        lat: item.lat,
        lng: item.lng,
      }));
      if (list.length > 0) {
        setToCache(cacheKey, list);
        return list;
      }
    }
  } catch (err) {
    logger.warn('Failed to fetch EMSIFA provinces, using fallback list', { error: err });
  }

  return FALLBACK_PROVINCES;
}

/**
 * Fetch regencies/cities in a province (Level 2).
 */
export async function getRegencies(provinceId: string): Promise<Regency[]> {
  if (!provinceId) return [];
  const normalizedId = provinceId.trim();
  const cacheKey = `regions:regencies:${normalizedId}`;
  const cached = getFromCache<Regency[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${EMSIFA_BASE_URL}/regencies/${normalizedId}.json`, {
      signal: AbortSignal.timeout(1200),
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const json = await res.json();
      const rawList = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      const list: Regency[] = rawList.map((item: any) => ({
        id: String(item.id),
        provinceId: normalizedId,
        name: item.name,
        capital: item.capital,
        lat: item.lat,
        lng: item.lng,
      }));
      if (list.length > 0) {
        setToCache(cacheKey, list);
        return list;
      }
    }
  } catch (err) {
    logger.warn('Failed to fetch EMSIFA regencies, using fallback list', { provinceId, error: err });
  }

  return FALLBACK_REGENCIES[normalizedId] || [];
}

/**
 * Fetch districts in a regency/city (Level 3).
 */
export async function getDistricts(regencyId: string): Promise<District[]> {
  if (!regencyId) return [];
  const normalizedId = regencyId.trim();
  const cacheKey = `regions:districts:${normalizedId}`;
  const cached = getFromCache<District[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${EMSIFA_BASE_URL}/districts/${normalizedId}.json`, {
      signal: AbortSignal.timeout(1200),
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const json = await res.json();
      const rawList = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      const list: District[] = rawList.map((item: any) => ({
        id: String(item.id),
        regencyId: normalizedId,
        name: item.name,
        lat: item.lat,
        lng: item.lng,
      }));
      if (list.length > 0) {
        setToCache(cacheKey, list);
        return list;
      }
    }
  } catch (err) {
    logger.warn('Failed to fetch EMSIFA districts, using fallback list', { regencyId, error: err });
  }

  return FALLBACK_DISTRICTS[normalizedId] || [];
}

/**
 * Fetch villages/kelurahan in a district (Level 4, with postal codes).
 */
export async function getVillages(districtId: string): Promise<Village[]> {
  if (!districtId) return [];
  const normalizedId = districtId.trim();
  const cacheKey = `regions:villages:${normalizedId}`;
  const cached = getFromCache<Village[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${EMSIFA_BASE_URL}/villages/${normalizedId}.json`, {
      signal: AbortSignal.timeout(1200),
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const json = await res.json();
      const rawList = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      const list: Village[] = rawList.map((item: any) => ({
        id: String(item.id),
        districtId: normalizedId,
        name: item.name,
        postalCode: item.postal_code ? String(item.postal_code) : undefined,
        lat: item.lat,
        lng: item.lng,
      }));
      if (list.length > 0) {
        setToCache(cacheKey, list);
        return list;
      }
    }
  } catch (err) {
    logger.warn('Failed to fetch EMSIFA villages, using fallback list', { districtId, error: err });
  }

  return FALLBACK_VILLAGES[normalizedId] || [];
}

/**
 * Reverse lookup: Find province, regency, district, village from a 5-digit postal code.
 */
export async function lookupPostalCode(postalCode: string | number): Promise<PostalCodeLookupResult[]> {
  const code = String(postalCode || '').trim();
  if (!/^\d{5}$/.test(code)) return [];

  const cacheKey = `regions:postal:${code}`;
  const cached = getFromCache<PostalCodeLookupResult[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${EMSIFA_BASE_URL}/postal-codes/${code}.json`, {
      signal: AbortSignal.timeout(1200),
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const json = await res.json();
      const rawList = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      const list: PostalCodeLookupResult[] = rawList.map((item: any) => {
        const villageName = item.name || '';
        const districtName = item.district?.name || '';
        const regencyName = item.regency?.name || '';
        const provinceName = item.province?.name || '';
        return {
          postalCode: code,
          villageId: String(item.id || ''),
          villageName,
          districtId: String(item.district?.id || ''),
          districtName,
          regencyId: String(item.regency?.id || ''),
          regencyName,
          provinceId: String(item.province?.id || ''),
          provinceName,
          formattedAddress: `${villageName}, ${districtName}, ${regencyName}, ${provinceName} ${code}`.replace(/^, /, ''),
        };
      });

      if (list.length > 0) {
        setToCache(cacheKey, list);
        return list;
      }
    }
  } catch (err) {
    logger.warn('Failed to lookup EMSIFA postal code, using fallback mapping', { code, error: err });
  }

  return FALLBACK_POSTAL_CODES[code] || [];
}

