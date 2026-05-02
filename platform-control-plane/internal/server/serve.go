// Package server wires HTTP routes, middleware, and server lifecycle.
package server

import (
	"context"
	"errors"
	"net/http"

	"go.uber.org/zap"

	"github.com/nsh-2026/platform-control-plane/internal/config"
)

// Server wraps *http.Server with Start/Stop lifecycle.
type Server struct {
	httpServer      *http.Server
	shutdownTimeout config.Server
	log             *zap.Logger
	errCh           chan error
}

// New creates a configured HTTP server.
func New(cfg config.Server, handler http.Handler, log *zap.Logger) *Server {
	return &Server{
		httpServer: &http.Server{
			Addr:         cfg.ListenAddr,
			Handler:      handler,
			ReadTimeout:  cfg.ReadTimeout,
			WriteTimeout: cfg.WriteTimeout,
			IdleTimeout:  cfg.IdleTimeout,
		},
		shutdownTimeout: cfg,
		log:             log,
		errCh:           make(chan error, 1),
	}
}

// Start begins serving in a background goroutine. Non-blocking.
// If ListenAndServe fails, the error is available via Err().
func (s *Server) Start() {
	go func() {
		s.log.Info("http server listening", zap.String("addr", s.httpServer.Addr))
		if err := s.httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			s.log.Error("http server error", zap.Error(err))
			s.errCh <- err
		}
	}()
}

// Err returns a channel that receives an error if the server fails to start.
// Use in a select alongside sigChan to detect startup failures.
func (s *Server) Err() <-chan error {
	return s.errCh
}

// Stop gracefully shuts down the HTTP server.
func (s *Server) Stop() {
	ctx, cancel := context.WithTimeout(context.Background(), s.shutdownTimeout.ShutdownTimeout)
	defer cancel()

	if err := s.httpServer.Shutdown(ctx); err != nil {
		s.log.Error("http shutdown error", zap.Error(err))
	}
	s.log.Info("http server stopped")
}
