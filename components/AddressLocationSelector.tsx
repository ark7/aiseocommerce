'use client';

import React, { useState, useEffect } from 'react';
import type { Province, Regency, District, Village, PostalCodeLookupResult } from '@/lib/indonesiaRegions';

export interface SelectedLocationData {
  provinceId: string;
  provinceName: string;
  regencyId: string;
  regencyName: string;
  districtId: string;
  districtName: string;
  villageId?: string;
  villageName?: string;
  postalCode: string;
  streetAddress: string;
  fullFormattedAddress: string;
}

interface AddressLocationSelectorProps {
  initialPostalCode?: string;
  initialStreetAddress?: string;
  onChange: (data: SelectedLocationData) => void;
  compact?: boolean;
  required?: boolean;
}

export default function AddressLocationSelector({
  initialPostalCode = '',
  initialStreetAddress = '',
  onChange,
  compact = false,
  required = true,
}: AddressLocationSelectorProps) {
  const [activeTab, setActiveTab] = useState<'POSTAL' | 'CASCADE'>('POSTAL');

  // Form Fields
  const [postalInput, setPostalInput] = useState(initialPostalCode);
  const [streetAddress, setStreetAddress] = useState(initialStreetAddress);

  // Cascading Selection State
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [regencies, setRegencies] = useState<Regency[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedRegencyId, setSelectedRegencyId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedVillageId, setSelectedVillageId] = useState('');

  // Selected Names for Summary
  const [selectedLocation, setSelectedLocation] = useState<Partial<SelectedLocationData>>({
    postalCode: initialPostalCode,
    streetAddress: initialStreetAddress,
  });

  // UI Loaders & Messages
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingRegencies, setLoadingRegencies] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);
  const [loadingPostal, setLoadingPostal] = useState(false);
  const [postalError, setPostalError] = useState<string | null>(null);
  const [postalCandidates, setPostalCandidates] = useState<PostalCodeLookupResult[]>([]);

  // 1. Initial load of provinces for cascade mode
  useEffect(() => {
    let isMounted = true;
    async function loadProvinces() {
      setLoadingProvinces(true);
      try {
        const res = await fetch('/api/regions/provinces');
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data)) {
          setProvinces(json.data);
        }
      } catch {
        // Handled silently
      } finally {
        if (isMounted) setLoadingProvinces(false);
      }
    }
    loadProvinces();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Cascade Step 1: Province changed -> load regencies
  const handleProvinceChange = async (provId: string) => {
    setSelectedProvinceId(provId);
    setSelectedRegencyId('');
    setSelectedDistrictId('');
    setSelectedVillageId('');
    setRegencies([]);
    setDistricts([]);
    setVillages([]);

    const prov = provinces.find((p) => p.id === provId);
    if (!provId || !prov) return;

    setLoadingRegencies(true);
    try {
      const res = await fetch(`/api/regions/regencies?provinceId=${provId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRegencies(json.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingRegencies(false);
    }
  };

  // 3. Cascade Step 2: Regency changed -> load districts
  const handleRegencyChange = async (regId: string) => {
    setSelectedRegencyId(regId);
    setSelectedDistrictId('');
    setSelectedVillageId('');
    setDistricts([]);
    setVillages([]);

    if (!regId) return;

    setLoadingDistricts(true);
    try {
      const res = await fetch(`/api/regions/districts?regencyId=${regId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDistricts(json.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingDistricts(false);
    }
  };

  // 4. Cascade Step 3: District changed -> load villages
  const handleDistrictChange = async (distId: string) => {
    setSelectedDistrictId(distId);
    setSelectedVillageId('');
    setVillages([]);

    if (!distId) return;

    setLoadingVillages(true);
    try {
      const res = await fetch(`/api/regions/villages?districtId=${distId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setVillages(json.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingVillages(false);
    }
  };

  // 5. Cascade Step 4: Village changed -> lock postal code & notify parent
  const handleVillageChange = (vilId: string) => {
    setSelectedVillageId(vilId);
    const vil = villages.find((v) => v.id === vilId);
    const dist = districts.find((d) => d.id === selectedDistrictId);
    const reg = regencies.find((r) => r.id === selectedRegencyId);
    const prov = provinces.find((p) => p.id === selectedProvinceId);

    if (!vil || !dist || !reg || !prov) return;

    const detectedPostal = vil.postalCode || postalInput || '';
    setPostalInput(detectedPostal);

    const regionSummary = `Kel. ${vil.name}, Kec. ${dist.name}, ${reg.name}, ${prov.name} ${detectedPostal}`;
    const full = streetAddress ? `${streetAddress.trim()}, ${regionSummary}` : regionSummary;

    const locData: SelectedLocationData = {
      provinceId: prov.id,
      provinceName: prov.name,
      regencyId: reg.id,
      regencyName: reg.name,
      districtId: dist.id,
      districtName: dist.name,
      villageId: vil.id,
      villageName: vil.name,
      postalCode: detectedPostal,
      streetAddress: streetAddress.trim(),
      fullFormattedAddress: full,
    };

    setSelectedLocation(locData);
    onChange(locData);
  };

  // 6. Fast Postal Code Lookup (5 digits)
  const handlePostalLookup = async (code: string) => {
    const cleanCode = code.trim();
    setPostalInput(cleanCode);
    setPostalError(null);
    setPostalCandidates([]);

    if (cleanCode.length !== 5 || !/^\d{5}$/.test(cleanCode)) {
      if (cleanCode.length > 5) {
        setPostalError('Kode pos Indonesia harus 5 digit angka.');
      }
      return;
    }

    setLoadingPostal(true);
    try {
      const res = await fetch(`/api/regions/postal-code/${cleanCode}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setPostalCandidates(json.data);
        // If single match or primary candidate, apply immediately
        applyPostalCandidate(json.data[0], cleanCode);
      } else {
        setPostalError(`Wilayah dengan kode pos ${cleanCode} tidak ditemukan. Silakan gunakan tab 'Pilih Bertingkat'.`);
      }
    } catch {
      setPostalError('Gagal memeriksa kode pos. Silakan coba lagi.');
    } finally {
      setLoadingPostal(false);
    }
  };

  const applyPostalCandidate = (item: PostalCodeLookupResult, code: string) => {
    const regionSummary = `${item.villageName ? `Kel. ${item.villageName}, ` : ''}Kec. ${item.districtName}, ${item.regencyName}, ${item.provinceName} ${code}`;
    const full = streetAddress ? `${streetAddress.trim()}, ${regionSummary}` : regionSummary;

    const locData: SelectedLocationData = {
      provinceId: item.provinceId,
      provinceName: item.provinceName,
      regencyId: item.regencyId,
      regencyName: item.regencyName,
      districtId: item.districtId,
      districtName: item.districtName,
      villageId: item.villageId,
      villageName: item.villageName,
      postalCode: code,
      streetAddress: streetAddress.trim(),
      fullFormattedAddress: full,
    };

    setSelectedLocation(locData);
    onChange(locData);
  };

  // 7. Update street address and propagate full address
  const handleStreetAddressChange = (street: string) => {
    setStreetAddress(street);
    if (selectedLocation.regencyName && selectedLocation.districtName) {
      const regionPart = `${selectedLocation.villageName ? `Kel. ${selectedLocation.villageName}, ` : ''}Kec. ${selectedLocation.districtName}, ${selectedLocation.regencyName}, ${selectedLocation.provinceName} ${selectedLocation.postalCode || ''}`.trim();
      const full = street.trim() ? `${street.trim()}, ${regionPart}` : regionPart;
      const updated: SelectedLocationData = {
        provinceId: selectedLocation.provinceId || '',
        provinceName: selectedLocation.provinceName || '',
        regencyId: selectedLocation.regencyId || '',
        regencyName: selectedLocation.regencyName || '',
        districtId: selectedLocation.districtId || '',
        districtName: selectedLocation.districtName || '',
        villageId: selectedLocation.villageId,
        villageName: selectedLocation.villageName,
        postalCode: selectedLocation.postalCode || postalInput,
        streetAddress: street.trim(),
        fullFormattedAddress: full,
      };
      setSelectedLocation(updated);
      onChange(updated);
    }
  };

  return (
    <div className="space-y-3.5 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between border-b pb-2">
        <label className="block text-sm font-semibold text-gray-900">
          Penentuan Wilayah & Alamat Pengiriman {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex bg-gray-200 p-0.5 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('POSTAL')}
            className={`px-2.5 py-1 rounded-md transition ${
              activeTab === 'POSTAL' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🔍 Cari via Kode Pos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CASCADE')}
            className={`px-2.5 py-1 rounded-md transition ${
              activeTab === 'CASCADE' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🏛️ Pilih Bertingkat
          </button>
        </div>
      </div>

      {/* MODE A: FAST POSTAL CODE AUTOCOMPLETE */}
      {activeTab === 'POSTAL' && (
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                maxLength={5}
                value={postalInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                  setPostalInput(val);
                  if (val.length === 5) handlePostalLookup(val);
                }}
                placeholder="Ketik 5 digit kode pos tujuan (contoh: 12110)"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono tracking-wider focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={() => handlePostalLookup(postalInput)}
              disabled={loadingPostal || postalInput.length !== 5}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 shrink-0"
            >
              {loadingPostal ? 'Mencari...' : 'Lookup'}
            </button>
          </div>

          {postalError && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
              {postalError}
            </p>
          )}

          {postalCandidates.length > 1 && (
            <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-xs space-y-2">
              <p className="text-xs font-semibold text-gray-700">
                Pilih Kelurahan yang Sesuai ({postalCandidates.length} kelurahan terdaftar pada kode pos ini):
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {postalCandidates.map((c) => {
                  const isSel = selectedLocation.villageId === c.villageId;
                  return (
                    <button
                      key={c.villageId}
                      type="button"
                      onClick={() => applyPostalCandidate(c, postalInput)}
                      className={`w-full text-left p-2 rounded-lg text-xs transition border flex justify-between items-center ${
                        isSel
                          ? 'bg-indigo-50 border-indigo-500 font-bold text-indigo-900'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <span>
                        Kel. {c.villageName}, Kec. {c.districtName}
                      </span>
                      <span className="text-[11px] text-gray-500">{c.regencyName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE B: HIERARCHICAL CASCADING SELECTOR */}
      {activeTab === 'CASCADE' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Provinsi */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Provinsi</label>
            <select
              value={selectedProvinceId}
              onChange={(e) => handleProvinceChange(e.target.value)}
              disabled={loadingProvinces}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">-- Pilih Provinsi --</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kota / Kabupaten */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Kota / Kabupaten</label>
            <select
              value={selectedRegencyId}
              onChange={(e) => handleRegencyChange(e.target.value)}
              disabled={loadingRegencies || !selectedProvinceId}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100"
            >
              <option value="">
                {loadingRegencies ? 'Memuat Kota...' : selectedProvinceId ? '-- Pilih Kota/Kabupaten --' : '-- Pilih Provinsi Dulu --'}
              </option>
              {regencies.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kecamatan */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Kecamatan</label>
            <select
              value={selectedDistrictId}
              onChange={(e) => handleDistrictChange(e.target.value)}
              disabled={loadingDistricts || !selectedRegencyId}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100"
            >
              <option value="">
                {loadingDistricts ? 'Memuat Kecamatan...' : selectedRegencyId ? '-- Pilih Kecamatan --' : '-- Pilih Kota Dulu --'}
              </option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kelurahan / Desa */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Kelurahan / Desa</label>
            <select
              value={selectedVillageId}
              onChange={(e) => handleVillageChange(e.target.value)}
              disabled={loadingVillages || !selectedDistrictId}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100"
            >
              <option value="">
                {loadingVillages ? 'Memuat Kelurahan...' : selectedDistrictId ? '-- Pilih Kelurahan/Desa --' : '-- Pilih Kecamatan Dulu --'}
              </option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.postalCode ? `(${v.postalCode})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* DETECTED LOCATION BADGE */}
      {selectedLocation.regencyName && selectedLocation.districtName && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 text-base">📍</span>
            <div>
              <p className="font-bold">
                {selectedLocation.villageName ? `Kel. ${selectedLocation.villageName}, ` : ''}
                Kec. {selectedLocation.districtName}, {selectedLocation.regencyName}
              </p>
              <p className="text-[11px] text-emerald-700">
                {selectedLocation.provinceName} • Kode Pos: <strong>{selectedLocation.postalCode || postalInput || '-'}</strong>
              </p>
            </div>
          </div>
          <span className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
            Terverifikasi
          </span>
        </div>
      )}

      {/* DETAIL ALAMAT (JALAN, NO RUMAH, RT/RW) */}
      {!compact && (
        <div>
          <label htmlFor="streetDetail" className="block text-xs font-semibold text-gray-700 mb-1">
            Alamat Spesifik (Jalan, Nomor Rumah, RT/RW, Patokan) {required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            id="streetDetail"
            rows={2}
            value={streetAddress}
            onChange={(e) => handleStreetAddressChange(e.target.value)}
            placeholder="Contoh: Jl. Panglima Polim No. 12B, RT 02/RW 04, Seberang Minimarket"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 bg-white"
          />
        </div>
      )}
    </div>
  );
}

