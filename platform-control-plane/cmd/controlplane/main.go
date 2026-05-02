// Command controlplane is the platform control plane server.
package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/nsh-2026/platform-control-plane/internal/clickhouse"
	"github.com/nsh-2026/platform-control-plane/internal/config"
	"github.com/nsh-2026/platform-control-plane/internal/devices"
	"github.com/nsh-2026/platform-control-plane/internal/health"
	"github.com/nsh-2026/platform-control-plane/internal/server"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "fatal: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	log, err := newLogger(os.Getenv("LOG_LEVEL"))
	if err != nil {
		return fmt.Errorf("init logger: %w", err)
	}
	defer func() { _ = log.Sync() }()

	log.Info("starting control plane")

	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	connectCtx, connectCancel := context.WithTimeout(ctx, cfg.ClickHouse.DialTimeout)
	chConn, err := clickhouse.New(connectCtx, cfg.ClickHouse, log.Named("clickhouse"))
	connectCancel()
	if err != nil {
		return fmt.Errorf("connect to clickhouse: %w", err)
	}
	defer func() {
		if err := chConn.Close(); err != nil {
			log.Error("error closing clickhouse", zap.Error(err))
		}
	}()

	healthHandler := health.New(chConn, log.Named("health"))
	deviceHandler := devices.New(log.Named("devices"))
	router := server.NewRouter(healthHandler, deviceHandler, log)
	srv := server.New(cfg.Server, router, log.Named("server"))
	srv.Start()

	select {
	case <-sigChan:
		log.Info("received shutdown signal, starting graceful shutdown")
	case err := <-srv.Err():
		log.Error("http server failed to start", zap.Error(err))
		cancel()
		return err
	}

	cancel()
	srv.Stop()

	log.Info("graceful shutdown complete")
	return nil
}

func newLogger(level string) (*zap.Logger, error) {
	if level == "" {
		level = "info"
	}
	var lvl zapcore.Level
	if err := lvl.UnmarshalText([]byte(level)); err != nil {
		return nil, fmt.Errorf("invalid log level %q: %w", level, err)
	}

	return zap.Config{
		Level:            zap.NewAtomicLevelAt(lvl),
		Encoding:         "json",
		OutputPaths:      []string{"stderr"},
		ErrorOutputPaths: []string{"stderr"},
		EncoderConfig: zapcore.EncoderConfig{
			TimeKey:        "timestamp",
			LevelKey:       "level",
			NameKey:        "logger",
			CallerKey:      "caller",
			MessageKey:     "msg",
			StacktraceKey:  "stacktrace",
			LineEnding:     zapcore.DefaultLineEnding,
			EncodeLevel:    zapcore.LowercaseLevelEncoder,
			EncodeTime:     zapcore.ISO8601TimeEncoder,
			EncodeDuration: zapcore.StringDurationEncoder,
			EncodeCaller:   zapcore.ShortCallerEncoder,
		},
	}.Build()
}
