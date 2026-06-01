import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repoRoot, "src", "cli", "index.mjs");
const demo = path.join(repoRoot, "tmp", "smoke-project");

rmSync(demo, { recursive: true, force: true });

run(["doctor"]);
run(["init-project", "--out", demo, "--name", "SmokeProject"]);
run([
  "plan",
  "--source",
  path.join(repoRoot, "examples", "sanitized-project", "source", "source-list.csv"),
  "--out",
  path.join(demo, "workspace", "ledger.csv")
]);
run([
  "verify-local",
  "--ledger",
  path.join(demo, "workspace", "ledger.csv"),
  "--base",
  path.join(repoRoot, "examples", "sanitized-project"),
  "--out",
  path.join(demo, "workspace", "local-checks.json")
]);
run([
  "mock-upload",
  "--ledger",
  path.join(demo, "workspace", "ledger.csv"),
  "--backend",
  path.join(demo, "workspace", "mock-backend.json"),
  "--out",
  path.join(demo, "workspace", "upload-results.json")
]);
run([
  "backfill",
  "--ledger",
  path.join(demo, "workspace", "ledger.csv"),
  "--results",
  path.join(demo, "workspace", "upload-results.json"),
  "--out",
  path.join(demo, "workspace", "ledger-backfilled.csv")
]);
run([
  "report",
  "--ledger",
  path.join(demo, "workspace", "ledger-backfilled.csv"),
  "--out",
  path.join(demo, "workspace", "report.md")
]);
run([
  "plan-video-batch",
  "--ledger",
  path.join(repoRoot, "examples", "sanitized-project", "source", "video-ledger.csv"),
  "--out",
  path.join(demo, "workspace", "video-batch-plan.md")
]);

assertFile(path.join(demo, "AGENTS.md"));
assertFile(path.join(demo, "workspace", "local-checks.json"));
assertFile(path.join(demo, "workspace", "upload-results.json"));
assertFile(path.join(demo, "workspace", "ledger-backfilled.csv"));
assertFile(path.join(demo, "workspace", "report.md"));
assertFile(path.join(demo, "workspace", "video-batch-plan.md"));

const report = readFileSync(path.join(demo, "workspace", "report.md"), "utf8");
if (!report.includes("uploaded-verified")) {
  throw new Error("报告应包含 uploaded-verified 状态");
}
if (!report.includes("迁移报告")) {
  throw new Error("报告应包含中文标题");
}

const videoPlan = readFileSync(path.join(demo, "workspace", "video-batch-plan.md"), "utf8");
for (const expected of ["<50MB", "50-500MB", "500MB-2GB", "near-2GB", ">2GB", "needs-short-name"]) {
  if (!videoPlan.includes(expected)) {
    throw new Error(`视频批次计划应包含 ${expected}`);
  }
}
if (!videoPlan.includes("视频批次计划")) {
  throw new Error("视频批次计划应包含中文标题");
}
if (!videoPlan.includes("| needs-short-name | 1 |")) {
  throw new Error("视频批次计划应包含 1 条 needs-short-name 分桶");
}

console.log("冒烟测试通过");

function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`命令失败：${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }
}

function assertFile(filePath) {
  if (!existsSync(filePath)) throw new Error(`缺少预期文件：${filePath}`);
}
