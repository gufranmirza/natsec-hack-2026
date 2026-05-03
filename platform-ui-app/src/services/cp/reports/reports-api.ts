import { apiClient } from '@/components/lib/api-client';
import {
  type CommonListParams,
  type Page,
  buildCommonParams,
  qs,
} from '@/services/cp/shared';
import type { Report } from '@/types/ontology';

// Report has no dedicated FK filter param yet (entity_refs is an array
// column; use /linked/report_references_entity for that traversal).
// CommonListParams covers subtype (radio/sigint/osint/operator) and
// source (e.g., feed:opensky) which is enough for col-status panels.
export type ReportsListParams = CommonListParams;

function buildQuery(p?: ReportsListParams): string {
  return qs(buildCommonParams(p));
}

export const getReports = async (
  params?: ReportsListParams,
  token?: string,
): Promise<Page<Report>> => {
  return apiClient<Page<Report>>(
    `/api/v1/objects/Report${buildQuery(params)}`,
    {},
    token,
  );
};

export const getReport = async (id: string, token?: string): Promise<Report> => {
  return apiClient<Report>(
    `/api/v1/objects/Report/${encodeURIComponent(id)}`,
    {},
    token,
  );
};
