import { useQuery } from '@tanstack/react-query';

import {
  type ReportsListParams,
  getReport,
  getReports,
} from '@/services/cp/reports/reports-api';
import { type Page, commonKey } from '@/services/cp/shared';
import type { Report } from '@/types/ontology';

export function useReports(
  params?: ReportsListParams,
  initialData?: Page<Report>,
  refetchInterval: number | false = 5000,
) {
  return useQuery({
    queryKey: ['cp', 'reports', 'list', commonKey(params)],
    queryFn: () => getReports(params),
    initialData,
    refetchInterval,
  });
}

export function useReport(id: string, initialData?: Report) {
  return useQuery({
    queryKey: ['cp', 'reports', id],
    queryFn: () => getReport(id),
    initialData,
    enabled: !!id,
  });
}
