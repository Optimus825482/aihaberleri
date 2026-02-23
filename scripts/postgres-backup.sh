#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_COUNT="${RETENTION_COUNT:-2}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-postgres}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/postgres-${DB_NAME}-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -Iseconds)] Backup started: ${BACKUP_FILE}"

pg_dump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --no-owner \
  --no-privileges \
  --format=plain | gzip -9 > "${BACKUP_FILE}"

echo "[$(date -Iseconds)] Backup completed"

# En yeni N yedek kalsın (varsayılan: 2)
if [ "${RETENTION_COUNT}" -gt 0 ]; then
  ls -1t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | tail -n +$((RETENTION_COUNT + 1)) | while read -r old_file; do
    [ -n "${old_file}" ] || continue
    rm -f "${old_file}"
    echo "[$(date -Iseconds)] Old backup removed: ${old_file}"
  done
fi

echo "[$(date -Iseconds)] Backup cleanup done (keep=${RETENTION_COUNT})"
