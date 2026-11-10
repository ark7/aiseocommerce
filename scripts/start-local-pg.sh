#!/usr/bin/env bash
PGDATA="/home/ngabsenid/.local/share/postgresql/data"
PGLOG="/home/ngabsenid/.local/share/postgresql/postgresql.log"

if /usr/bin/pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  echo "✅ PostgreSQL local sudah aktif di port 5432."
  exit 0
fi

echo "🚀 Menjalankan PostgreSQL 16 local..."
/usr/lib/postgresql/16/bin/pg_ctl -D "$PGDATA" -l "$PGLOG" start

if /usr/bin/pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  echo "✅ PostgreSQL local berhasil dijalankan pada localhost:5432!"
else
  echo "❌ Gagal menjalankan PostgreSQL local. Cek log di: $PGLOG"
  exit 1
fi

