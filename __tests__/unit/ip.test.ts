import { getIPAddress } from '@/lib/ip';

function request(headers: Record<string, string>) {
  return new Request('http://localhost/', { headers });
}

const ORIGINAL_HOPS = process.env.TRUSTED_PROXY_HOPS;

afterEach(() => {
  if (ORIGINAL_HOPS === undefined) delete process.env.TRUSTED_PROXY_HOPS;
  else process.env.TRUSTED_PROXY_HOPS = ORIGINAL_HOPS;
});

describe('getIPAddress', () => {
  test('membaca entri terakhir, bukan yang ditulis klien', () => {
    // Klien mengarang `1.2.3.4`; proxy menambahkan alamat sebenarnya di kanan.
    expect(getIPAddress(request({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('5.6.7.8');
  });

  test('tidak bisa digeser oleh awalan yang dikarang klien', () => {
    const forged = '1.1.1.1, 2.2.2.2, 3.3.3.3, 5.6.7.8';
    expect(getIPAddress(request({ 'x-forwarded-for': forged }))).toBe('5.6.7.8');
  });

  test('menghitung mundur sejumlah hop yang dikonfigurasi', () => {
    process.env.TRUSTED_PROXY_HOPS = '2';

    expect(getIPAddress(request({ 'x-forwarded-for': '1.2.3.4, 9.9.9.9, 8.8.8.8' }))).toBe('9.9.9.9');
  });

  test('tidak melempar saat rantainya lebih pendek dari jumlah hop', () => {
    process.env.TRUSTED_PROXY_HOPS = '5';

    expect(getIPAddress(request({ 'x-forwarded-for': '1.2.3.4' }))).toBe('1.2.3.4');
  });

  test('mengabaikan konfigurasi hop yang tidak masuk akal', () => {
    process.env.TRUSTED_PROXY_HOPS = 'abc';
    expect(getIPAddress(request({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('5.6.7.8');

    process.env.TRUSTED_PROXY_HOPS = '0';
    expect(getIPAddress(request({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('5.6.7.8');
  });

  test('jatuh ke x-real-ip saat tidak ada x-forwarded-for', () => {
    expect(getIPAddress(request({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8');
  });

  test('tanpa header sama sekali, semua pemanggil berbagi satu keranjang', () => {
    // Sengaja bukan nilai acak per request: keranjang bersama membatasi,
    // keranjang baru tiap request tidak membatasi apa pun.
    expect(getIPAddress(request({}))).toBe('unknown');
    expect(getIPAddress(request({}))).toBe(getIPAddress(request({})));
  });
});
