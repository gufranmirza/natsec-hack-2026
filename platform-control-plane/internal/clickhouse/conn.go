// Package clickhouse manages the ClickHouse connection pool.
package clickhouse

import (
	"context"
	"fmt"

	ch "github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"go.uber.org/zap"

	"github.com/nsh-2026/platform-control-plane/internal/config"
)

// Conn wraps the clickhouse-go v2 native protocol connection pool.
type Conn struct {
	pool driver.Conn
	log  *zap.Logger
}

// New opens a connection pool and verifies connectivity.
// The ctx should carry a deadline for the initial ping.
func New(ctx context.Context, cfg config.ClickHouse, log *zap.Logger) (*Conn, error) {
	log.Info("connecting to clickhouse",
		zap.String("addr", cfg.Addr),
		zap.String("database", cfg.Database),
	)

	pool, err := ch.Open(&ch.Options{
		Addr: []string{cfg.Addr},
		Auth: ch.Auth{
			Database: cfg.Database,
			Username: cfg.Username,
			Password: cfg.Password,
		},
		Settings: ch.Settings{
			"async_insert":          1,
			"wait_for_async_insert": 0,
		},
		DialTimeout:     cfg.DialTimeout,
		ConnMaxLifetime: cfg.ConnMaxLifetime,
		MaxOpenConns:    cfg.MaxOpenConns,
		MaxIdleConns:    cfg.MaxIdleConns,
	})
	if err != nil {
		return nil, fmt.Errorf("clickhouse open: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		_ = pool.Close()
		return nil, fmt.Errorf("clickhouse ping: %w", err)
	}

	log.Info("clickhouse connected")

	return &Conn{pool: pool, log: log}, nil
}

// Pool returns the underlying driver connection for batch operations.
func (c *Conn) Pool() driver.Conn {
	return c.pool
}

// Ping checks connectivity.
func (c *Conn) Ping(ctx context.Context) error {
	return c.pool.Ping(ctx)
}

// Close closes the connection pool.
func (c *Conn) Close() error {
	c.log.Info("closing clickhouse connection")
	return c.pool.Close()
}
