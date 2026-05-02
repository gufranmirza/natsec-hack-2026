import type { ListEnvelope } from '@/services/types';

export interface Device {
  device_id: string;
  hostname: string;
  os: string;
  os_version: string;
  agent_version: string;
  status: 'active' | 'revoked' | 'dormant';
  registered_at: string;
  last_seen_at: string;
  session_count?: number;
  event_count_24h?: number;
}

export type DevicesListResponse = ListEnvelope<Device>;

export interface DevicePatchRequest {
  status: 'active' | 'revoked' | 'dormant';
}
