#!/bin/bash
# Testa o banco num Postgres local: aplica o imitador do Supabase, as migrações e os testes.
# Uso: PGHOST=/tmp PGPORT=54329 bash scripts/test-db.sh
set -e
cd "$(dirname "$0")/.."
DB=appcristao_test
export PGUSER=${PGUSER:-postgres}
psql -q -d postgres -o /dev/null -c "drop database if exists $DB" -c "create database $DB" >/dev/null
run() { psql -q -v ON_ERROR_STOP=1 -d $DB -f "$1" >/dev/null; }
run supabase/tests/00_supabase_stub.sql
for f in supabase/migrations/*.sql; do run "$f"; done
fail=0
for f in supabase/tests/[1-9]*.sql; do
  if out=$(psql -q -t -o /dev/null -v ON_ERROR_STOP=1 -d $DB -f "$f" 2>&1); then
    echo "$out" | grep -o "passou: .*" | sed 's/^/  ok  /'
    echo "$(basename "$f"): $(echo "$out" | grep -c "passou:") testes passaram"
  else
    echo "$out" | grep -o "passou: .*" | sed 's/^/  ok  /'
    echo "$out" | grep -E "ERROR|FALHOU" | head -5
    echo "$(basename "$f"): FALHOU"; fail=1
  fi
done
exit $fail
