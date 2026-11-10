import {
  getProvinces,
  getRegencies,
  getDistricts,
  getVillages,
  lookupPostalCode,
} from '@/lib/indonesiaRegions';
import { GET as getProvincesRoute } from '@/app/api/regions/provinces/route';
import { GET as getRegenciesRoute } from '@/app/api/regions/regencies/route';
import { GET as getDistrictsRoute } from '@/app/api/regions/districts/route';
import { GET as getVillagesRoute } from '@/app/api/regions/villages/route';
import { GET as lookupPostalCodeRoute } from '@/app/api/regions/postal-code/[code]/route';

describe('EMSIFA Wilayah Indonesia API Integration', () => {
  describe('lib/indonesiaRegions — Core Regional Logic', () => {
    it('returns list of Indonesian provinces with valid names and IDs', async () => {
      const provinces = await getProvinces();
      expect(Array.isArray(provinces)).toBe(true);
      expect(provinces.length).toBeGreaterThan(0);
      const jabar = provinces.find((p) => p.name.includes('Jawa Barat') || p.id === '32');
      expect(jabar).toBeDefined();
    });

    it('returns regencies for a given province ID', async () => {
      const regencies = await getRegencies('31'); // DKI Jakarta
      expect(Array.isArray(regencies)).toBe(true);
      expect(regencies.length).toBeGreaterThan(0);
      const jaksel = regencies.find((r) => r.name.includes('Jakarta Selatan') || r.id === '31.74');
      expect(jaksel).toBeDefined();
    });

    it('returns districts for a given regency ID', async () => {
      const districts = await getDistricts('31.74'); // Jakarta Selatan
      expect(Array.isArray(districts)).toBe(true);
      expect(districts.length).toBeGreaterThan(0);
      const kebayoran = districts.find((d) => d.name.includes('Kebayoran Baru') || d.id === '31.74.07');
      expect(kebayoran).toBeDefined();
    });

    it('returns villages with valid 5-digit postal codes for a district', async () => {
      const villages = await getVillages('31.74.07'); // Kebayoran Baru
      expect(Array.isArray(villages)).toBe(true);
      expect(villages.length).toBeGreaterThan(0);
      const selong = villages.find((v) => v.name.includes('Selong'));
      expect(selong).toBeDefined();
      if (selong?.postalCode) {
        expect(selong.postalCode).toMatch(/^\d{5}$/);
      }
    });

    it('performs reverse lookup for 5-digit postal code 12110', async () => {
      const results = await lookupPostalCode('12110');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      const match = results[0];
      expect(match.postalCode).toBe('12110');
      expect(match.regencyName).toContain('Jakarta Selatan');
      expect(match.districtName).toContain('Kebayoran Baru');
      expect(match.formattedAddress).toContain('12110');
    });

    it('returns empty array for invalid or non-existent postal codes', async () => {
      const invalidShort = await lookupPostalCode('123');
      expect(invalidShort).toEqual([]);

      const nonExistent = await lookupPostalCode('00000');
      expect(nonExistent).toEqual([]);
    });
  });

  describe('Regional API Routes', () => {
    it('GET /api/regions/provinces returns 200 with list of provinces', async () => {
      const res = await getProvincesRoute();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('GET /api/regions/regencies returns 200 when provinceId is supplied', async () => {
      const req = new Request('http://localhost/api/regions/regencies?provinceId=35');
      const res = await getRegenciesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('GET /api/regions/regencies returns 400 when provinceId is omitted', async () => {
      const req = new Request('http://localhost/api/regions/regencies');
      const res = await getRegenciesRoute(req);
      expect(res.status).toBe(400);
    });

    it('GET /api/regions/districts returns 200 when regencyId is supplied', async () => {
      const req = new Request('http://localhost/api/regions/districts?regencyId=35.78');
      const res = await getDistrictsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('GET /api/regions/villages returns 200 when districtId is supplied', async () => {
      const req = new Request('http://localhost/api/regions/villages?districtId=35.78.08');
      const res = await getVillagesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('GET /api/regions/postal-code/[code] returns 200 with location data for valid code', async () => {
      const req = new Request('http://localhost/api/regions/postal-code/12110');
      const res = await lookupPostalCodeRoute(req, { params: { code: '12110' } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.postalCode).toBe('12110');
      expect(json.data.length).toBeGreaterThan(0);
    });

    it('GET /api/regions/postal-code/[code] returns 400 for malformed code', async () => {
      const req = new Request('http://localhost/api/regions/postal-code/abc');
      const res = await lookupPostalCodeRoute(req, { params: { code: 'abc' } });
      expect(res.status).toBe(400);
    });
  });
});

