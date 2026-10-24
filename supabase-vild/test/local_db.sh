#!/usr/bin/env bash
# Applies the VILD migrations + seed to a throw-away Postgres 16 cluster and
# runs test/assertions.sql. Needs initdb/pg_ctl/postgres/psql (Debian:
# /usr/lib/postgresql/16/bin). pg_cron, pg_net, realtime and storage do not
# exist locally; the migrations guard those blocks. auth.users / auth.uid()
# are stubbed by test/stub_auth.sql.
#
#   bash supabase-vild/test/local_db.sh            # run and tear down
#   KEEP=1 bash supabase-vild/test/local_db.sh     # keep the cluster running
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
WORK="${WORK:-${TMPDIR:-/tmp}/vild-pg-$$}"
PORT="${PGPORT_LOCAL:-54329}"
DB=vild_test

mkdir -p "$WORK"
cleanup() {
  if [ -z "${KEEP:-}" ]; then
    run_as "$PGBIN/pg_ctl -D $WORK/data -s stop -m fast" >/dev/null 2>&1 || true   # pg_ctl refuses to run as root
    rm -rf "$WORK"
  else
    echo "cluster kept at $WORK (port $PORT): psql -h $WORK -p $PORT -U postgres $DB"
  fi
}
trap cleanup EXIT

# initdb must not run as root; drop to a nobody-ish user when needed
run_as() {
  if [ "$(id -u)" = 0 ]; then
    chown -R nobody "$WORK"
    su -s /bin/sh nobody -c "$*"
  else
    sh -c "$*"
  fi
}

run_as "$PGBIN/initdb -D $WORK/data -U postgres -A trust --locale=C.UTF-8 -E UTF8 >$WORK/initdb.log 2>&1"
run_as "$PGBIN/pg_ctl -D $WORK/data -o '-p $PORT -k $WORK -c listen_addresses= -c log_min_messages=warning' -l $WORK/pg.log -w start >/dev/null"

PSQL="$PGBIN/psql -v ON_ERROR_STOP=1 -q -h $WORK -p $PORT -U postgres"
$PSQL -d postgres -c "create database $DB" >/dev/null
echo "== stub auth / roles"
$PSQL -d $DB -f "$HERE/stub_auth.sql"
for f in "$ROOT"/migrations/*.sql; do
  echo "== $(basename "$f")"
  $PSQL -d $DB -f "$f"
done
echo "== seed/seed.sql"
$PSQL -d $DB -f "$ROOT/seed/seed.sql"
echo "== test/assertions.sql"
$PSQL -d $DB -f "$HERE/assertions.sql"
echo "local_db: ok"
