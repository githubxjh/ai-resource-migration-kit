#!/usr/bin/env node

import { copyFile, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv, formatCsv } from "../core/csv.mjs";
import { inspectLocalFile } from "../core/fileChecks.mjs";
import { LEDGER_HEADERS, normalizeSourceRow, summarizeStatuses, COMPLETED_STATUSES, isBlocked } from "../core/status.mjs";
import { classifyVideoRow, summarizeBatchPlans } from "../core/batchPlanner.mjs";
import { loadMockBackend, saveMockBackend, uploadAndVerify } from "../adapters/mockBackend.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  switch (command) {
    case "doctor":
      await doctor();
      break;
    case "init-project":
      await initProject(requireArg(args, "out"), args.name || "ResourceMigration");
      break;
    case "plan":
      await plan(requireArg(args, "source"), requireArg(args, "out"));
      break;
    case "verify-local":
      await verifyLocal(requireArg(args, "ledger"), requireArg(args, "base"), requireArg(args, "out"));
      break;
    case "mock-upload":
      await mockUpload(requireArg(args, "ledger"), requireArg(args, "backend"), requireArg(args, "out"));
      break;
    case "backfill":
      await backfill(requireArg(args, "ledger"), requireArg(args, "results"), requireArg(args, "out"));
      break;
    case "report":
      await report(requireArg(args, "ledger"), requireArg(args, "out"));
      break;
    case "plan-video-batch":
      await planVideoBatch(requireArg(args, "ledger"), requireArg(args, "out"));
      break;
    case "clean-demo":
      await cleanDemo(requireArg(args, "path"));
      break;
    default:
      usage(command);
  }
}

function parseArgs(items) {
  const args = {};
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const value = items[i + 1]?.startsWith("--") ? "true" : items[i + 1] ?? "true";
    args[key] = value;
    if (value !== "true") i += 1;
  }
  return args;
}

function requireArg(args, key) {
  if (!args[key]) throw new Error(`缺少必需参数 --${key}`);
  return args[key];
}

function usage(command) {
  if (command) console.error(`未知命令：${command}`);
  console.error(`用法：
  npm run cli -- doctor
  npm run cli -- init-project --out <dir> [--name <name>]
  npm run cli -- plan --source <source-list.csv> --out <ledger.csv>
  npm run cli -- verify-local --ledger <ledger.csv> --base <base-dir> --out <checks.json>
  npm run cli -- mock-upload --ledger <ledger.csv> --backend <mock-backend.json> --out <results.json>
  npm run cli -- backfill --ledger <ledger.csv> --results <results.json> --out <ledger.csv>
  npm run cli -- report --ledger <ledger.csv> --out <report.md>
  npm run cli -- plan-video-batch --ledger <ledger.csv> --out <video-batch-plan.md>

安装为命令后也可使用：
  armk doctor`);
  process.exit(1);
}

async function doctor() {
  const result = {
    ok: true,
    node: process.version,
    repo_root: repoRoot,
    commands: ["init-project", "plan", "verify-local", "mock-upload", "backfill", "report", "plan-video-batch"]
  };
  console.log(JSON.stringify(result, null, 2));
}

async function initProject(outDir, name) {
  const root = path.resolve(outDir);
  await mkdir(root, { recursive: true });
  await mkdir(path.join(root, "workspace", "logs"), { recursive: true });
  await mkdir(path.join(root, "workspace", "reports"), { recursive: true });
  await copyFile(path.join(repoRoot, "agents", "AGENTS.md"), path.join(root, "AGENTS.md"));
  await copyFile(path.join(repoRoot, "agents", "CLAUDE.md"), path.join(root, "CLAUDE.md"));
  await copyTemplate("HANDOFF.md", root);
  await copyTemplate("PROJECT_GUIDE.md", root);
  await copyTemplate("PROGRESS.md", root);
  await copyFile(path.join(repoRoot, "templates", "ledger.csv"), path.join(root, "workspace", "ledger.csv"));
  await writeFile(path.join(root, "PROJECT_NAME.txt"), `${name}\n`, "utf8");
  console.log(`已初始化 ${root}`);
}

async function copyTemplate(name, root) {
  await copyFile(path.join(repoRoot, "templates", name), path.join(root, name));
}

async function plan(sourcePath, outPath) {
  const rows = parseCsv(await readFile(sourcePath, "utf8")).map(normalizeSourceRow);
  await mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
  await writeFile(outPath, formatCsv(rows, LEDGER_HEADERS), "utf8");
  console.log(JSON.stringify({ written: outPath, rows: rows.length }, null, 2));
}

async function verifyLocal(ledgerPath, baseDir, outPath) {
  const rows = parseCsv(await readFile(ledgerPath, "utf8"));
  const checks = [];
  for (const row of rows) {
    const inspection = await inspectLocalFile(baseDir, row.relative_path);
    checks.push({
      source_row_id: row.source_row_id,
      resource_name: row.resource_name,
      relative_path: row.relative_path,
      ok: inspection.exists && inspection.size_bytes > 0,
      ...inspection
    });
  }
  await mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(checks, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ written: outPath, checked: checks.length }, null, 2));
}

async function planVideoBatch(ledgerPath, outPath) {
  const rows = parseCsv(await readFile(ledgerPath, "utf8"));
  const plans = rows.filter((row) => row.resource_type === "video").map(classifyVideoRow);
  const summary = summarizeBatchPlans(plans);
  const lines = [
    "# 视频批次计划",
    "",
    "本计划使用公开版半匿名资源中心规则。真实上传前，必须在私有项目画像中确认平台限制。",
    "",
    "## 摘要",
    "",
    "| 大小分桶 | 数量 |",
    "|---|---:|",
    ...summary.map(([bucket, count]) => `| ${bucket} | ${count} |`),
    "",
    "## 推荐顺序",
    "",
    "1. `<50MB` 安全首批候选。",
    "2. `50-500MB` 使用 file input 或私有流式适配器，串行处理。",
    "3. `500MB-2GB` 按单条批次处理。",
    "4. `near-2GB` 放最后，只按单条处理。",
    "5. `>2GB`、`needs-short-name`、源文件失败和等待重复复用确认的任务进入后处理。",
    "",
    "## 明细",
    "",
    "| 行 | 资源 | 字节大小 | 分桶 | 策略 | 并发 | 验证方式 | 停线条件 | 建议状态 |",
    "|---|---|---:|---|---|---|---|---|---|",
    ...plans.map((item) =>
      `| ${item.source_row_id} | ${item.resource_name} | ${item.local_size_bytes || ""} | ${item.size_bucket} | ${item.strategy} | ${item.concurrency} | ${item.verification} | ${item.stop_condition} | ${item.status_recommendation} |`
    ),
    ""
  ];
  await mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
  await writeFile(outPath, lines.join("\n"), "utf8");
  console.log(JSON.stringify({ written: outPath, rows: plans.length }, null, 2));
}

async function mockUpload(ledgerPath, backendPath, outPath) {
  const rows = parseCsv(await readFile(ledgerPath, "utf8"));
  const backend = await loadMockBackend(backendPath);
  const results = [];
  for (const row of rows) {
    if (row.status !== "candidate") {
      results.push({
        source_row_id: row.source_row_id,
        status: "needs-review",
        evidence: `模拟上传已跳过，状态=${row.status}`
      });
      continue;
    }
    results.push(uploadAndVerify(backend, row));
  }
  await saveMockBackend(backendPath, backend);
  await mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ written: outPath, results: results.length }, null, 2));
}

async function backfill(ledgerPath, resultsPath, outPath) {
  const rows = parseCsv(await readFile(ledgerPath, "utf8"));
  const results = JSON.parse(await readFile(resultsPath, "utf8"));
  const byRowId = new Map(results.map((result) => [result.source_row_id, result]));
  const now = new Date().toISOString();
  const merged = rows.map((row) => {
    const result = byRowId.get(row.source_row_id);
    if (!result) return row;
    return {
      ...row,
      status: result.status || row.status,
      backend_id: result.backend_id || row.backend_id || "",
      backend_name: result.backend_name || row.backend_name || "",
      evidence: result.evidence || row.evidence || "",
      operator: row.operator || "ai-resource-migration-kit",
      updated_at: now,
      notes: result.error ? `${row.notes || ""} ${result.error}`.trim() : row.notes
    };
  });
  await mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
  await writeFile(outPath, formatCsv(merged, LEDGER_HEADERS), "utf8");
  console.log(JSON.stringify({ written: outPath, rows: merged.length }, null, 2));
}

async function report(ledgerPath, outPath) {
  const rows = parseCsv(await readFile(ledgerPath, "utf8"));
  const summary = summarizeStatuses(rows);
  const completed = rows.filter((row) => COMPLETED_STATUSES.has(row.status)).length;
  const blocked = rows.filter((row) => isBlocked(row.status)).length;
  const pending = rows.length - completed - blocked;
  const lines = [
    "# 迁移报告",
    "",
    "## 摘要",
    "",
    "| 指标 | 数量 |",
    "|---|---:|",
    `| 总任务数 | ${rows.length} |`,
    `| 已完成 | ${completed} |`,
    `| 待处理或需复核 | ${pending} |`,
    `| 已阻塞或失败 | ${blocked} |`,
    "",
    "## 状态统计",
    "",
    "| 状态 | 数量 |",
    "|---|---:|",
    ...summary.map(([status, count]) => `| ${status} | ${count} |`),
    "",
    "## 明细",
    "",
    "| 行 | 资源 | 类型 | 状态 | 后台 ID | 后台名称 | 证据 |",
    "|---|---|---|---|---|---|---|",
    ...rows.map((row) =>
      `| ${row.source_row_id} | ${row.resource_name} | ${row.resource_type} | ${row.status} | ${row.backend_id || ""} | ${row.backend_name || ""} | ${row.evidence || ""} |`
    ),
    ""
  ];
  await mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
  await writeFile(outPath, lines.join("\n"), "utf8");
  console.log(JSON.stringify({ written: outPath, rows: rows.length }, null, 2));
}

async function cleanDemo(targetPath) {
  const resolved = path.resolve(targetPath);
  const allowedRoot = path.resolve(repoRoot, "tmp");
  if (!resolved.startsWith(`${allowedRoot}${path.sep}`) && resolved !== allowedRoot) {
    throw new Error(`Refusing to clean outside repo tmp directory: ${resolved}`);
  }
  await rm(resolved, { recursive: true, force: true });
  console.log(`已删除 ${resolved}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
