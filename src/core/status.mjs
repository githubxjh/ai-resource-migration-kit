export const LEDGER_HEADERS = [
  "source_row_id",
  "resource_name",
  "resource_type",
  "source_url",
  "relative_path",
  "size_bucket",
  "status",
  "backend_id",
  "backend_name",
  "local_size_bytes",
  "local_hash",
  "evidence",
  "operator",
  "updated_at",
  "notes"
];

export const COMPLETED_STATUSES = new Set(["uploaded-verified", "existing-reused"]);
export const INTERMEDIATE_STATUSES = new Set([
  "download-ready",
  "local-verified",
  "upload-candidate",
  "uploaded-object-only",
  "resource-created-unverified",
  "needs-short-name"
]);
export const BLOCKED_PREFIXES = [
  "blocked-",
  "upload-failed",
  "verification-failed",
  "partial-unknown"
];

export function normalizeSourceRow(row) {
  const sourceRowId = row.source_row_id || row.row_id || row.id || "";
  const resourceName = row.resource_name || row.name || row.filename || "";
  const resourceType = row.resource_type || row.type || "other";
  const sourceUrl = row.source_url || row.url || "";
  const relativePath = row.relative_path || row.path || "";

  if (!sourceRowId || !resourceName || !relativePath) {
    throw new Error(
      `源清单行缺少必需字段：${JSON.stringify({
        source_row_id: sourceRowId,
        resource_name: resourceName,
        relative_path: relativePath
      })}`
    );
  }

  return {
    source_row_id: sourceRowId,
    resource_name: resourceName,
    resource_type: resourceType,
    source_url: sourceUrl,
    relative_path: relativePath,
    size_bucket: "",
    status: "candidate",
    backend_id: "",
    backend_name: "",
    local_size_bytes: "",
    local_hash: "",
    evidence: "",
    operator: "",
    updated_at: "",
    notes: ""
  };
}

export function summarizeStatuses(rows) {
  const summary = new Map();
  for (const row of rows) {
    const status = row.status || "unknown";
    summary.set(status, (summary.get(status) ?? 0) + 1);
  }
  return [...summary.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function isBlocked(status) {
  return BLOCKED_PREFIXES.some((prefix) => status.startsWith(prefix));
}

export function isIntermediate(status) {
  return INTERMEDIATE_STATUSES.has(status);
}
