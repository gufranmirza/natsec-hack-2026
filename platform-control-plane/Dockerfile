FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o /controlplane ./cmd/controlplane/

FROM alpine:3.21

COPY --from=builder /controlplane /usr/local/bin/controlplane

ENTRYPOINT ["/usr/local/bin/controlplane"]
