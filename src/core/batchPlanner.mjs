const MB = 1024 * 1024;
const GB = 1024 * MB;

export function classifyVideoRow(row) {
  const size = Number(row.local_size_bytes || 0);
  const name = row.resource_name || "";
  const extension = extensionOf(row.relative_path || name);
  const nameLength = Array.from(stripExtension(name)).length;

  if (row.resource_type !== "video") {
    return {
      source_row_id: row.source_row_id,
      resource_name: row.resource_name,
      resource_type: row.resource_type,
      size_bucket: "not-video",
      strategy: "使用该资源类型对应的 runbook。",
      concurrency: "n/a",
      verification: "后台精确搜索",
      stop_condition: "资源类型不匹配",
      status_recommendation: row.status || "needs-review"
    };
  }

  if (!size || size <= 0) {
    return plan(row, "unknown-size", "先暂停，直到本地大小已确认。", "无", "后续如上传，上传后做后台精确搜索", "本地大小缺失或为 0", "blocked-missing-file");
  }

  if (nameLength > 64) {
    return plan(row, "needs-short-name", "上传前准备人能识别的短名 staged copy。", "仅离线准备", "记录原名、短名和后台 ID", "资源名超过公开默认 64 字符风险阈值", "needs-short-name");
  }

  if (size > 2 * GB) {
    return plan(row, ">2GB", "不要按原样上传；转入压缩、拆分或平台侧决策。", "无", "不能按原样上传", "超过公开视频默认限制", "blocked-size-limit");
  }

  if (size >= 1800 * MB) {
    return plan(row, "near-2GB", "放在最后按单条批次处理；允许静默等待数分钟，并用后台 ID 验证。", "单条", "后台精确搜索并确认 ID", "超时、token 过期或没有后台 ID", "upload-candidate");
  }

  if (size >= 500 * MB) {
    return plan(row, "500MB-2GB", "单条或极小串行批次；避免 base64/CDP 路径。", "单条", "后台精确搜索并确认 ID", "runtime 超时、token 过期或没有后台 ID", "upload-candidate");
  }

  if (size >= 50 * MB) {
    return plan(row, "50-500MB", "使用 file input 或私有流式适配器；保持串行上传。", "串行", "后台精确搜索并确认 ID", "base64 超时、token 过期或没有后台 ID", "upload-candidate");
  }

  const allowed = [".mp4", ".avi", ".rmvb", ".mpeg"].includes(extension);
  if (!allowed) {
    return plan(row, "<50MB", "上传前先暂停做格式复核。", "无", "格式确认前不可上传", `公开默认规则不支持该视频扩展名 ${extension || "(无)"}`, "blocked-format");
  }

  return plan(row, "<50MB", "精确预搜索后可作为安全首批候选。", "小批串行", "后台精确搜索并确认 ID", "工作区/页签错误、上传组件残留文件或没有后台 ID", "upload-candidate");
}

export function summarizeBatchPlans(plans) {
  const summary = new Map();
  for (const item of plans) {
    summary.set(item.size_bucket, (summary.get(item.size_bucket) ?? 0) + 1);
  }
  return [...summary.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function plan(row, sizeBucket, strategy, concurrency, verification, stopCondition, statusRecommendation) {
  return {
    source_row_id: row.source_row_id,
    resource_name: row.resource_name,
    local_size_bytes: row.local_size_bytes || "",
    size_bucket: sizeBucket,
    strategy,
    concurrency,
    verification,
    stop_condition: stopCondition,
    status_recommendation: statusRecommendation
  };
}

function bucketForSize(size) {
  if (size > 2 * GB) return ">2GB";
  if (size >= 1800 * MB) return "near-2GB";
  if (size >= 500 * MB) return "500MB-2GB";
  if (size >= 50 * MB) return "50-500MB";
  return "<50MB";
}

function stripExtension(name) {
  return name.replace(/\.[^.]+$/, "");
}

function extensionOf(value) {
  const match = value.toLowerCase().match(/\.[^.\\/]+$/);
  return match ? match[0] : "";
}
