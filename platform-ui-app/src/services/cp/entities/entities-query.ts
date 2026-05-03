import { useQuery } from '@tanstack/react-query';

import {
  type EntitiesListParams,
  getEntities,
  getEntity,
} from '@/services/cp/entities/entities-api';
import { type Page, commonKey } from '@/services/cp/shared';
import type { Entity } from '@/types/ontology';

export function useEntities(
  params?: EntitiesListParams,
  initialData?: Page<Entity>,
  refetchInterval: number | false = 5000,
) {
  return useQuery({
    queryKey: ['cp', 'entities', 'list', entitiesKey(params)],
    queryFn: () => getEntities(params),
    initialData,
    refetchInterval,
  });
}

function entitiesKey(p?: EntitiesListParams): string {
  const base = commonKey(p);
  const extras: string[] = [];
  if (p?.affiliation && p.affiliation.length > 0) {
    extras.push(`aff=${[...p.affiliation].sort().join(',')}`);
  }
  return [base, ...extras].filter(Boolean).join('&');
}

export function useEntity(id: string, initialData?: Entity) {
  return useQuery({
    queryKey: ['cp', 'entities', id],
    queryFn: () => getEntity(id),
    initialData,
    enabled: !!id,
  });
}
