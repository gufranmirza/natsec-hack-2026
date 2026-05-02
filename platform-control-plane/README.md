# platform-control-plane

Edge-native AI mission commander control plane. The "AIP layer" of the platform —
owns the typed Ontology, mediates LLM reasoning, executes Actions, and propagates
state changes. See [docs/0001-platform-architecture.md](docs/0001-platform-architecture.md)
for the full architecture.

## Quick start

```bash
# 1. Start ClickHouse locally (one option)
docker run -d --name ch -p 9000:9000 -p 8123:8123 \
  -e CLICKHOUSE_DB=ontology \
  clickhouse/clickhouse-server:latest

# 2. Set env vars
cp .env.example .env
set -a; source .env; set +a

# 3. Build and run
make run

# 4. Health check
curl http://localhost:8080/api/v1/health
```

## Layout

```
cmd/controlplane/        single binary entrypoint
internal/
  auth/                  bearer-token middleware
  clickhouse/            connection pool
  config/                env-based config + validation
  health/                /health endpoint
  server/                http server lifecycle + router
docs/                    architecture decision records
```

Future packages (per ADR 0001): `nats`, `ontology`, `action`, `logic`, `llm`, `ingest`.

## Development

```bash
make build       # build binary to ./bin/controlplane
make test        # tests with race detector
make check       # pre-commit hooks
```

Requires Go 1.24+.
