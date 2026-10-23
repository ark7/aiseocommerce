# AGENTS.md — Development Guidelines for AI Agents

Pedoman dan aturan operasional wajib untuk AI Agent (Antigravity, Gemini, dll.) saat bekerja di repositori `ai-seo-ecommerce-saas`.

---

## 1. Aturan Manajemen Database & Prisma (Wajib)

### A. Sinkronisasi Skema Selalu 2 Langkah (Anti-Schema Drift)
Setiap kali melakukan modifikasi pada [`prisma/schema.prisma`](file:///home/ngabsenid/aiseocommerce/aiseocommerce/prisma/schema.prisma):
1. **Generate Client**: Jalankan `npx prisma generate` (atau `npm run db:generate`).
2. **Push ke Database Remote**: **WAJIB** segera jalankan `npx prisma db push` (atau `npm run db:push`) ke database Neon PostgreSQL.
> [!IMPORTANT]
> **Dilarang keras hanya menjalankan `prisma generate` tanpa `prisma db push`**. Jika skema hanya di-generate lokal, query SQL Next.js akan menuntut kolom baru yang belum ada di PostgreSQL, menyebabkan error `The column does not exist` dan merusak halaman toko (*Store not found*).

### B. Akses Jaringan untuk Koneksi Neon PostgreSQL
- Database project ini di-hosting di cloud (**Neon PostgreSQL AWS Singapore**).
- Perintah yang membutuhkan koneksi langsung ke database (seperti `npx prisma db push`, `npx prisma db pull`, dan server `npm run dev`) **membutuhkan akses jaringan keluar (network)**.
- Jika command dijalankan di dalam sandbox terisolasi tanpa akses internet, Prisma akan mengembalikan error `P1001: Can't reach database server`. Pastikan izin jaringan diaktifkan (`BypassSandbox: true`) saat menjalankan perintah database dan dev server.

### C. Error Handling & Fallback Bertingkat (No Silent Swallowing)
- Jangan pernah membungkus query utama dan relasi sekunder ke dalam satu blok `try { ... } catch { return null; }` yang menelan error tanpa logging.
- Pisahkan pemuatan data dasar (seperti `Store`) dari relasi tambahan (`products`, `articles`).
- Jika relasi gagal dimuat atau mengalami masalah sementara, sistem harus tetap merender toko dengan fallback array kosong (`products: []`), bukan mengubah store menjadi `null` yang memicu tampilan `Store not found`.
- Selalu catat error ke logger atau console agar mudah diinvestigasi.

---

## 2. Aturan Next.js Build & Dev Server

### Hindari Konflik Cache `.next`
- **Jangan menjalankan `npm run build` bersamaan ketika `npm run dev` sedang aktif** pada port 3000.
- Ini akan menyebabkan tabrakan file manifest dan lock pada direktori `.next`.
- **Workflow yang benar:**
  1. Hentikan task `npm run dev` terlebih dahulu.
  2. Jalankan `npm run build` untuk memverifikasi type-checking dan bundle.
  3. Setelah selesai, jalankan kembali `npm run dev` sebagai daemon dengan akses jaringan aktif.

---

## 3. Ringkasan Perintah Penting

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run db:generate` | Update Prisma Client lokal setelah schema berubah |
| `npm run db:push` | Terapkan perubahan schema ke database Neon PostgreSQL |
| `npm test` | Jalankan seluruh unit test dengan Jest |
| `npm run build` | Verifikasi build produksi Next.js |
| `npm run dev` | Jalankan server pengembangan lokal (port 3000) |
