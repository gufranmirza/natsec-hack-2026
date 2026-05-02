import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getDevice,
  getDevices,
  patchDevice,
} from '@/services/devices/devices-api';
import type {
  Device,
  DevicePatchRequest,
  DevicesListResponse,
} from '@/services/devices/types';

export function useDevices(initialData?: DevicesListResponse) {
  return useQuery({
    queryKey: ['devices', 'list'],
    queryFn: () => getDevices(),
    initialData,
  });
}

export function useDevice(deviceId: string, initialData?: Device) {
  return useQuery({
    queryKey: ['devices', deviceId],
    queryFn: () => getDevice(deviceId),
    initialData,
    enabled: !!deviceId,
  });
}

export function usePatchDevice(deviceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DevicePatchRequest) => patchDevice(deviceId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}
