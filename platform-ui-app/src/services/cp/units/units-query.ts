import { useQuery } from '@tanstack/react-query';

import {
  type UnitsListParams,
  getUnit,
  getUnits,
} from '@/services/cp/units/units-api';
import { type Page, commonKey } from '@/services/cp/shared';
import type { Unit } from '@/types/ontology';

export function useUnits(
  params?: UnitsListParams,
  initialData?: Page<Unit>,
  refetchInterval: number | false = 5000,
) {
  return useQuery({
    queryKey: ['cp', 'units', 'list', commonKey(params)],
    queryFn: () => getUnits(params),
    initialData,
    refetchInterval,
  });
}

export function useUnit(id: string, initialData?: Unit) {
  return useQuery({
    queryKey: ['cp', 'units', id],
    queryFn: () => getUnit(id),
    initialData,
    enabled: !!id,
  });
}
