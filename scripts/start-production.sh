#!/usr/bin/env sh
set -eu

# Resolve DATABASE_URL from common platform variable names.
RAW_DATABASE_URL="${DATABASE_URL:-${POSTGRES_URL:-${POSTGRESQL_URL:-${PGDATABASE_URL:-}}}}"

if [ -z "${RAW_DATABASE_URL}" ]; then
  echo "ERROR: No database URL found. Set DATABASE_URL (or POSTGRES_URL/POSTGRESQL_URL/PGDATABASE_URL)." >&2
  exit 1
fi

# Trim whitespace and remove optional surrounding quotes.
DATABASE_URL="$(printf '%s' "${RAW_DATABASE_URL}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
DATABASE_URL="${DATABASE_URL#\"}"
DATABASE_URL="${DATABASE_URL%\"}"
DATABASE_URL="${DATABASE_URL#\'}"
DATABASE_URL="${DATABASE_URL%\'}"
export DATABASE_URL

case "${DATABASE_URL}" in
  postgresql://*|postgres://*)
    ;;
  *)
    echo "ERROR: DATABASE_URL must start with postgresql:// or postgres:// (current value is invalid)." >&2
    exit 1
    ;;
esac

echo "Running Prisma migrations..."
npx prisma migrate deploy
echo "Starting application..."
exec npm start
