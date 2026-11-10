#!/usr/bin/env bash
PGDATA="/home/ngabsenid/.local/share/postgresql/data"

echo "🛑 Menghentikan PostgreSQL 16 local..."
/usr/lib/postgresql/16/bin/pg_ctl -D "$PGDATA" stop
echo "✅ PostgreSQL local berhasil dihentikan."

