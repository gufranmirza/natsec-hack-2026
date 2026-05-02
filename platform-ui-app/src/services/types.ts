// Pagination information (legacy platform-api shape, kept for parity).
export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

// Controlplane list-response envelope (ADR 0008 §3.1): items + optional
// cursor + count. Used by devices / apps / sessions endpoints.
//
// `total` is set by handlers that run a separate COUNT query and
// reflects the full count of items matching all filters — useful for
// "Showing N of TOTAL" pagination labels. Optional because not every
// endpoint computes it.
export interface ListEnvelope<T> {
  items: T[];
  next_cursor?: string;
  count: number;
  total?: number;
}
