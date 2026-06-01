import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export async function loadMockBackend(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { next_id: 1001, resources: [] };
  }
}

export async function saveMockBackend(filePath, backend) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(backend, null, 2)}\n`, "utf8");
}

export function exactSearch(backend, task) {
  return backend.resources.filter(
    (resource) =>
      resource.backend_name === task.resource_name &&
      resource.resource_type === task.resource_type
  );
}

export function uploadAndVerify(backend, task) {
  const existing = exactSearch(backend, task);
  if (existing.length > 0) {
    const match = existing[0];
    return {
      source_row_id: task.source_row_id,
      status: "existing-reused",
      backend_id: match.backend_id,
      backend_name: match.backend_name,
      evidence: `模拟精确搜索命中 ${match.backend_id}`
    };
  }

  const backendId = `MOCK-${backend.next_id}`;
  backend.next_id += 1;
  const resource = {
    backend_id: backendId,
    backend_name: task.resource_name,
    resource_type: task.resource_type,
    source_row_id: task.source_row_id
  };
  backend.resources.push(resource);

  const verified = exactSearch(backend, task).some((item) => item.backend_id === backendId);
  return {
    source_row_id: task.source_row_id,
    status: verified ? "uploaded-verified" : "verification-failed",
    backend_id: verified ? backendId : "",
    backend_name: verified ? task.resource_name : "",
    evidence: verified ? `模拟精确搜索已验证 ${backendId}` : "上传后模拟搜索失败"
  };
}
