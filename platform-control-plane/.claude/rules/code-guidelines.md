## Go Code Guidelines

### Naming

**General:**
- `MixedCaps` or `mixedCaps` only — never underscores in identifiers
- Never `ALL_CAPS` for constants. Use `maxPacketSize` not `MAX_PACKET_SIZE`
- Variable name length proportional to scope size. Single-letter for tiny scopes, descriptive for large scopes
- Short receiver names: one or two letters, abbreviation of type (`c` for `Client`). Never `this`, `self`, `me`
- Be consistent with receiver names across all methods of a type

**Packages:**
- Short, lowercase, single-word. No underscores, no mixedCaps
- Never name packages `util`, `common`, `helper`, `misc`, `api`, `types`, `interfaces`

**Exported Names:**
- Never repeat the package name: `widget.New()` not `widget.NewWidget()`
- Constructor for single exported type: just `New()`. Multiple types: `NewTypeName()`
- Never prefix getters with `Get`. Use `obj.Owner()` not `obj.GetOwner()`. Setters use `SetOwner()`

**Interfaces:**
- One-method interfaces: method name + `-er` suffix (`Reader`, `Writer`, `Closer`)
- Consistent case for initialisms: `URL` or `url`, never `Url`. `appID` not `appId`

### Documentation
- All exported names must have doc comments — full sentences starting with the declared name
- Error strings: lowercase, no trailing punctuation
- Don't log errors you return — let the caller decide
- Document concurrency safety when ambiguous

### Imports
- Group: (1) stdlib, (2) third-party, (3) local packages. Blank lines between groups
- Use `goimports`. Never rename imports unless collision. No dot imports in production

---

### Error Handling

- Always return `error` as last value. Return `error` interface, never concrete types
- Check every error. Never discard with `_`
- `%w` to preserve error chain for `errors.Is()`/`errors.As()`. `%v` at system boundaries
- Place `%w` at end: `fmt.Errorf("loading config: %w", err)`. Don't duplicate underlying error context
- Use `errors.Join()` for multi-error returns (Go 1.20+)
- Early return on error. Happy path at minimal indentation. Never `else` after error check
- Sentinel values (`var ErrNotFound = errors.New(...)`) for simple cases. Structured errors for programmatic inspection
- Never `panic` for normal errors. `panic` only for: unrecoverable states, API misuse, `Must*` at startup

---

### Functions and Methods

- Synchronous by default. Let callers add concurrency
- One thing per function. Under 50 lines when possible. Early returns over nesting
- `defer` immediately after acquiring a resource

**Receivers:**
- Pointer if: mutates, contains sync primitives, large struct
- Value if: small naturally-valued types (`time.Time`)
- Never pointer receiver on map/func/chan. Never mix receiver types. When in doubt: pointer

**Arguments:**
- Option structs for many params. Variadic options when most callers specify none
- `context.Context` always first param, never in structs or option types

---

### Interfaces
- Define at the consumer, not the implementor
- Return concrete types, accept interfaces
- Don't create until 2+ implementations exist. Don't create "for mocking"

---

### Concurrency

- Share memory by communicating, not the other way around
- Every goroutine must have a clear shutdown path. Expose `Close`/`Stop`/`Shutdown`
- Prefer `errgroup` over manual `WaitGroup` + goroutine management
- Never spawn unbounded goroutines — use worker pools or semaphores
- Channel buffer sizes: 0 or 1. Anything else needs justification
- Always specify channel direction in params (`<-chan` / `chan<-`)
- `context.Context` first param, never stored in structs, `Background()` only at entrypoints

**Memory Model — these cause real bugs:**
- Goroutine exit has no sync — explicit `WaitGroup`/channel to observe writes
- Seeing variable A set does NOT mean variable B (set before A) is visible to other goroutines
- Never busy-wait on non-atomic variables. Never double-checked locking — use `sync.Once`
- Always `-race` in tests and CI

---

### Modern Go (1.18+)

- Use `any` instead of `interface{}`
- Use `slices` and `maps` stdlib packages (Go 1.21+) instead of hand-rolling
- Use `errors.Join()` for combining multiple errors (Go 1.20+)
- Use generics only when they serve real business needs — not for single-type usage
- Use `t.Context()` in tests (Go 1.24+) instead of `context.Background()`

---

### Data Structures

- Nil slice (`var t []string`) over empty literal. Empty literal only for JSON `[]` encoding
- `len(s) == 0` for emptiness, not `s == nil`
- Pre-allocate slices/maps when size is known
- Comma-ok for maps: `v, ok := m[key]`
- Zero values should be useful without initialization
- Never copy structs with `sync.Mutex` or `bytes.Buffer`

---

### Performance — Hot Path Rules

For latency-sensitive code, think about allocations upfront. For everything else, profile first.

**Allocation:**
- Pre-allocate slices/maps when size is known (~10x for slices)
- Move buffer declarations outside hot loops
- `strconv` over `fmt` for conversions (~2x faster)
- Slices over maps when keys are dense integers
- `time.NewTimer` + `Stop()`/`Reset()` — never `time.After` in loops (leaks)

**Strings:**
- `strings.EqualFold()` not `strings.ToLower(a) == strings.ToLower(b)`
- `+` or `strings.Join()` for concat. `fmt.Sprintf` is slower
- Small substrings pin the entire backing string — copy to free

**Memory Layout:**
- Largest struct fields first (minimizes padding)
- Hot fields in first 64 bytes (cache line)
- Slices over maps for iteration (spatial locality)

**Sync:**
- `defer mu.Unlock()` immediately after `Lock()`. No I/O under lock
- `sync.Pool` for high-churn objects. Reset before `Put`
- Shard locks to reduce contention

**Anti-Patterns at Scale:**

| Anti-pattern | Fix |
|---|---|
| `binary.Read/Write` (reflection) | Manual binary parsing |
| `rand.Int()` (global mutex) | Per-goroutine `math/rand/v2` source |
| `fmt.Errorf` in hot path | Pre-allocated sentinel errors |
| `time.After` in select loop | `time.NewTimer` + `Stop`/`Reset` |
| Undrained HTTP response body | `io.Copy(io.Discard, resp.Body)` then `Close` |
| Interface boxing in tight loops | Concrete types or generics |
| Logging AND returning errors | One or the other, never both |
| `os.Exit`/`log.Fatal` outside main | Return errors; single exit in `main()` |
| Mutable global state | Dependency injection via constructors |

---

### Testing
- Table-driven tests with named struct fields and `t.Run` subtests
- Standard `testing` only — no assertion libraries
- `cmp.Equal()` / `cmp.Diff()` for complex comparisons
- `t.Helper()` in helpers. `t.Cleanup()` for teardown
- Failure format: `FuncName(input) = got, want expected`
- `t.Error`+`continue` for table entries. `t.Fatal` in subtests and setup failures
- Never `t.Fatal` from non-test goroutine
- `go test -race` always. Build tags for integration tests
- Test behavior, not implementation. Compare full structs, not field by field
- `go.uber.org/goleak` for goroutine leak detection

### Crypto
- Never `math/rand` for secrets. Always `crypto/rand`

---

### References

**Official:**
- [Effective Go](https://go.dev/doc/effective_go)
- [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments)
- [Go FAQ](https://go.dev/doc/faq)
- [Go Doc Comments](https://go.dev/doc/comment)
- [Go Memory Model](https://go.dev/ref/mem)
- [Go Modules Reference](https://go.dev/ref/mod)
