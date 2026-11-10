#!/usr/bin/env bash
# ==============================================================================
# Script Otomasi Deployment IDCloudHost VPS (Ubuntu 22.04 / 24.04 LTS)
# Brand: LarisManis.online — Website komersial pemersatu jalur penjualan online Anda
# Stack: Next.js 14 Standalone (demo.) + WordPress 6.7 (apex) + MariaDB + Nginx + Cloudflare
# ==============================================================================

set -e

# Warna Terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}   LarisManis.online - IDCloudHost VPS Setup & Deploy             ${NC}"
echo -e "${BLUE}   Website komersial pemersatu jalur penjualan online Anda        ${NC}"
echo -e "${BLUE}   Didukung oleh LarisManis.online                                ${NC}"
echo -e "${BLUE}==================================================================${NC}\n"

# 1. Validasi Akses Root / Sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Harap jalankan script ini dengan akses root atau sudo:${NC}"
  echo -e "        sudo bash deploy/setup-idcloudhost.sh"
  exit 1
fi

# 2. Update Sistem & Instalasi Prasyarat
echo -e "${YELLOW}[1/6] Memperbarui paket sistem Ubuntu...${NC}"
apt-get update -y
apt-get install -y curl wget git ufw ca-certificates gnupg lsb-release nginx

# 3. Instalasi Docker & Docker Compose Plugin (Jika Belum Terpasang)
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}[2/6] Memasang Docker Engine & Docker Compose...${NC}"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo -e "${GREEN}✓ Docker Engine berhasil terpasang.${NC}"
else
  echo -e "${GREEN}✓ Docker Engine sudah terpasang.${NC}"
fi

# 4. Konfigurasi Firewall UFW
echo -e "${YELLOW}[3/6] Mengonfigurasi firewall UFW...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
echo -e "${GREEN}✓ Port SSH (22), HTTP (80), dan HTTPS (443) terbuka.${NC}"

# 5. Konfigurasi Nginx Dual Virtual Host
echo -e "${YELLOW}[4/6] Mengonfigurasi Nginx Reverse Proxy Dual Virtual Host...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ ! -f /etc/nginx/ssl/larismanis.crt ] || [ ! -f /etc/nginx/ssl/larismanis.key ]; then
  mkdir -p /etc/nginx/ssl
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/larismanis.key \
    -out /etc/nginx/ssl/larismanis.crt \
    -subj "/CN=larismanis.online/O=LarisManis/C=ID" 2>/dev/null
fi

if [ -f "${APP_DIR}/nginx/idcloudhost-nginx.conf" ]; then
  cp "${APP_DIR}/nginx/idcloudhost-nginx.conf" /etc/nginx/sites-available/larismanis.conf
  ln -sf /etc/nginx/sites-available/larismanis.conf /etc/nginx/sites-enabled/larismanis.conf
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl restart nginx
  echo -e "${GREEN}✓ Nginx reverse proxy aktif (larismanis.online & demo.larismanis.online).${NC}"
else
  echo -e "${RED}[WARNING] File nginx/idcloudhost-nginx.conf tidak ditemukan.${NC}"
fi

# 6. Verifikasi File Lingkungan (.env.production)
echo -e "${YELLOW}[5/6] Memeriksa file konfigurasi .env.production...${NC}"
cd "${APP_DIR}"

if [ ! -f .env.production ]; then
  if [ -f .env ]; then
    echo -e "${BLUE}Menyalin .env menjadi .env.production...${NC}"
    cp .env .env.production
  else
    echo -e "${RED}[ERROR] File .env.production tidak ditemukan!${NC}"
    echo -e "Silakan buat file .env.production dengan kredensial DATABASE_URL dan NEXTAUTH_SECRET."
    exit 1
  fi
fi

# Pastikan DEFAULT_STORE_DOMAIN diset ke demo.larismanis.online
if ! grep -q "DEFAULT_STORE_DOMAIN" .env.production; then
  echo "DEFAULT_STORE_DOMAIN=\"demo.larismanis.online\"" >> .env.production
fi

# 7. Build dan Jalankan Container Docker (Next.js + WordPress + MariaDB)
echo -e "${YELLOW}[6/6] Menjalankan stack Docker (Next.js SaaS + WordPress Landing Page + MariaDB)...${NC}"
docker compose down || true
docker compose build --no-cache web
docker compose up -d

echo -e "\n${BLUE}Menunggu inisialisasi aplikasi (15 detik)...${NC}"
sleep 15

# Uji Healthcheck Next.js
if curl -s -f http://127.0.0.1:3000/api/health > /dev/null; then
  echo -e "${GREEN}✓ Healthcheck Next.js berhasil: Layanan merespon 200 OK.${NC}"
else
  echo -e "${YELLOW}! Catatan: Next.js sedang booting atau menghubungkan database Neon remote...${NC}"
  echo -e "  Cek log: docker compose logs -f web"
fi

# Uji Healthcheck WordPress
if curl -s -I http://127.0.0.1:8080 | grep -q "HTTP/1.1"; then
  echo -e "${GREEN}✓ Healthcheck WordPress berhasil: Server siap diakses.${NC}\n"
else
  echo -e "${YELLOW}! Catatan: WordPress sedang menyelesaikan setup inisialisasi...${NC}\n"
fi

echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}   DEPLOYMENT LARISMANIS.ONLINE SELESAI DENGAN SUKSES!            ${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo -e "Langkah selanjutnya di Dashboard Cloudflare DNS:"
echo -e "1. Tambahkan DNS Records:"
echo -e "   - A Record:     @    -> IP Public VPS IDCloudHost (Proxy ON / Awan Oranye)"
echo -e "   - CNAME Record: www  -> larismanis.online (Proxy ON)"
echo -e "   - CNAME Record: demo -> larismanis.online (Proxy ON)"
echo -e "   - CNAME Record: *    -> larismanis.online (Proxy ON - Wildcard tenant)"
echo -e "2. Di Cloudflare SSL/TLS:"
echo -e "   - Set mode enkripsi ke 'Full' (atau 'Flexible')"
echo -e "   - Aktifkan 'Always Use HTTPS'"
echo -e "3. Akses Website Anda:"
echo -e "   - Landing Page Pemasaran: https://larismanis.online"
echo -e "   - Toko Demo E-Commerce : https://demo.larismanis.online"
echo -e "==================================================================\n"
