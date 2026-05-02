import { apiClient } from '@/components/lib/api-client';
import type {
  Device,
  DevicePatchRequest,
  DevicesListResponse,
} from '@/services/devices/types';

export const getDevices = async (
  token?: string
): Promise<DevicesListResponse> => {
  return apiClient<DevicesListResponse>('/api/v1/devices', {}, token);
};

export const getDevice = async (
  deviceId: string,
  token?: string
): Promise<Device> => {
  return apiClient<Device>(
    `/api/v1/devices/${encodeURIComponent(deviceId)}`,
    {},
    token
  );
};

export const patchDevice = async (
  deviceId: string,
  body: DevicePatchRequest,
  token?: string
): Promise<Device> => {
  return apiClient<Device>(
    `/api/v1/devices/${encodeURIComponent(deviceId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
    token
  );
};
