// Package config loads and validates control plane configuration from
// environment variables. Each sub-struct is consumed by its respective package.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config is the top-level configuration, composed of sub-configs.
type Config struct {
	ClickHouse ClickHouse
	Server     Server
}

// ClickHouse holds connection pool settings.
type ClickHouse struct {
	Addr            string
	Database        string
	Username        string
	Password        string
	DialTimeout     time.Duration
	WriteTimeout    time.Duration
	ConnMaxLifetime time.Duration
	MaxOpenConns    int
	MaxIdleConns    int
}

// Server holds the HTTP server settings.
type Server struct {
	ListenAddr      string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	IdleTimeout     time.Duration
	ShutdownTimeout time.Duration
}

// Load reads all configuration from environment variables.
func Load() (*Config, error) {
	ch, err := loadClickHouse()
	if err != nil {
		return nil, err
	}

	s, err := loadServer()
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		ClickHouse: ch,
		Server:     s,
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate checks all sub-configs.
func (c *Config) Validate() error {
	var errs []error

	if c.ClickHouse.Addr == "" {
		errs = append(errs, errors.New("CLICKHOUSE_ADDR is required"))
	}
	if c.ClickHouse.Database == "" {
		errs = append(errs, errors.New("CLICKHOUSE_DATABASE is required"))
	}
	if c.ClickHouse.DialTimeout <= 0 {
		errs = append(errs, errors.New("CLICKHOUSE_DIAL_TIMEOUT_MS must be positive"))
	}
	if c.ClickHouse.WriteTimeout <= 0 {
		errs = append(errs, errors.New("CLICKHOUSE_WRITE_TIMEOUT_MS must be positive"))
	}
	if c.ClickHouse.ConnMaxLifetime <= 0 {
		errs = append(errs, errors.New("CLICKHOUSE_CONN_MAX_LIFETIME_SEC must be positive"))
	}
	if c.ClickHouse.MaxOpenConns <= 0 {
		errs = append(errs, errors.New("CLICKHOUSE_MAX_OPEN_CONNS must be positive"))
	}
	if c.ClickHouse.MaxIdleConns <= 0 {
		errs = append(errs, errors.New("CLICKHOUSE_MAX_IDLE_CONNS must be positive"))
	}

	if c.Server.ListenAddr == "" {
		errs = append(errs, errors.New("LISTEN_ADDR is required"))
	}
	if c.Server.ReadTimeout <= 0 {
		errs = append(errs, errors.New("HTTP_READ_TIMEOUT_SEC must be positive"))
	}
	if c.Server.WriteTimeout <= 0 {
		errs = append(errs, errors.New("HTTP_WRITE_TIMEOUT_SEC must be positive"))
	}
	if c.Server.IdleTimeout <= 0 {
		errs = append(errs, errors.New("HTTP_IDLE_TIMEOUT_SEC must be positive"))
	}
	if c.Server.ShutdownTimeout <= 0 {
		errs = append(errs, errors.New("HTTP_SHUTDOWN_TIMEOUT_SEC must be positive"))
	}

	return errors.Join(errs...)
}

func loadClickHouse() (ClickHouse, error) {
	dialMs, err := requireInt("CLICKHOUSE_DIAL_TIMEOUT_MS")
	if err != nil {
		return ClickHouse{}, err
	}
	writeMs, err := requireInt("CLICKHOUSE_WRITE_TIMEOUT_MS")
	if err != nil {
		return ClickHouse{}, err
	}
	lifetimeSec, err := requireInt("CLICKHOUSE_CONN_MAX_LIFETIME_SEC")
	if err != nil {
		return ClickHouse{}, err
	}
	maxOpen, err := requireInt("CLICKHOUSE_MAX_OPEN_CONNS")
	if err != nil {
		return ClickHouse{}, err
	}
	maxIdle, err := requireInt("CLICKHOUSE_MAX_IDLE_CONNS")
	if err != nil {
		return ClickHouse{}, err
	}

	return ClickHouse{
		Addr:            os.Getenv("CLICKHOUSE_ADDR"),
		Database:        os.Getenv("CLICKHOUSE_DATABASE"),
		Username:        os.Getenv("CLICKHOUSE_USERNAME"),
		Password:        os.Getenv("CLICKHOUSE_PASSWORD"),
		DialTimeout:     time.Duration(dialMs) * time.Millisecond,
		WriteTimeout:    time.Duration(writeMs) * time.Millisecond,
		ConnMaxLifetime: time.Duration(lifetimeSec) * time.Second,
		MaxOpenConns:    maxOpen,
		MaxIdleConns:    maxIdle,
	}, nil
}

func loadServer() (Server, error) {
	readSec, err := requireInt("HTTP_READ_TIMEOUT_SEC")
	if err != nil {
		return Server{}, err
	}
	writeSec, err := requireInt("HTTP_WRITE_TIMEOUT_SEC")
	if err != nil {
		return Server{}, err
	}
	idleSec, err := requireInt("HTTP_IDLE_TIMEOUT_SEC")
	if err != nil {
		return Server{}, err
	}
	shutdownSec, err := requireInt("HTTP_SHUTDOWN_TIMEOUT_SEC")
	if err != nil {
		return Server{}, err
	}

	return Server{
		ListenAddr:      os.Getenv("LISTEN_ADDR"),
		ReadTimeout:     time.Duration(readSec) * time.Second,
		WriteTimeout:    time.Duration(writeSec) * time.Second,
		IdleTimeout:     time.Duration(idleSec) * time.Second,
		ShutdownTimeout: time.Duration(shutdownSec) * time.Second,
	}, nil
}

func requireInt(key string) (int, error) {
	v := os.Getenv(key)
	if v == "" {
		return 0, fmt.Errorf("%s is required", key)
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return n, nil
}
