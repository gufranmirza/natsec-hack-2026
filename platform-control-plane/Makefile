BUILD_DIR = bin
BINARY = $(BUILD_DIR)/controlplane

# Auto-load .env if present so `make run` always uses it.
ifneq (,$(wildcard .env))
include .env
export
endif

.PHONY: build test test-v run check clean help

build:
	@mkdir -p $(BUILD_DIR)
	go build -o $(BINARY) ./cmd/controlplane

test:
	go test ./... -race -count=1

test-v:
	go test ./... -race -count=1 -v

run: build
	$(BINARY)

check:
	pre-commit run --all-files

clean:
	rm -rf $(BUILD_DIR)

help:
	@echo "Targets:"
	@echo "  build  - Build control plane binary"
	@echo "  test   - Run tests with race detector"
	@echo "  run    - Build and run locally (set env vars first; see .env.example)"
	@echo "  check  - Run pre-commit hooks"
	@echo "  clean  - Remove build artifacts"
