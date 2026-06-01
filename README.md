# AI 资源迁移工具包

AI 资源迁移工具包是一个公开版资源迁移作业框架，用来帮助 Codex、Claude Code 或其他代码代理在新的资料迁移项目里执行一套可审计、可恢复、可复用的流程。

它不是某个客户项目的备份，也不包含真实后台地址、登录信息、客户文件、资源 ID 或历史日志。它沉淀的是一套通用作业系统：

- 以源清单的每一行作为任务单位。
- 上传前先做本地文件、格式、大小、重复风险和目标后台检查。
- 上传成功必须有可查询 ID 或等价证据。
- 异常时停线并写入证据，不盲目重试。
- 每次暂停前更新交接、进度、台账和核查报告。

## 快速开始

要求：

- Node.js 18 或更新版本。
- PowerShell、Terminal、Git Bash 均可运行；示例命令以 PowerShell 写法为主。
- 真实后台适配器必须放在私有项目中，不要提交到公开仓库。

```powershell
cd D:\ai-resource-migration-kit
node .\src\cli\index.mjs doctor
node .\src\cli\index.mjs init-project --out .\tmp\demo-project --name DemoMigration
node .\src\cli\index.mjs plan --source .\examples\sanitized-project\source\source-list.csv --out .\tmp\demo-project\workspace\ledger.csv
node .\src\cli\index.mjs verify-local --ledger .\tmp\demo-project\workspace\ledger.csv --base .\examples\sanitized-project --out .\tmp\demo-project\workspace\local-checks.json
node .\src\cli\index.mjs mock-upload --ledger .\tmp\demo-project\workspace\ledger.csv --backend .\tmp\demo-project\workspace\mock-backend.json --out .\tmp\demo-project\workspace\upload-results.json
node .\src\cli\index.mjs backfill --ledger .\tmp\demo-project\workspace\ledger.csv --results .\tmp\demo-project\workspace\upload-results.json --out .\tmp\demo-project\workspace\ledger-backfilled.csv
node .\src\cli\index.mjs report --ledger .\tmp\demo-project\workspace\ledger-backfilled.csv --out .\tmp\demo-project\workspace\report.md
node .\src\cli\index.mjs plan-video-batch --ledger .\examples\sanitized-project\source\video-ledger.csv --out .\tmp\demo-project\workspace\video-batch-plan.md
```

也可以直接跑冒烟测试：

```powershell
npm run smoke
```

预期输出：

```text
冒烟测试通过
```

## 给同事 AI 的最快上手路径

把这段作为第一条消息发给同事的 Codex / Claude Code：

```text
你现在要使用 ai-resource-migration-kit 复刻一个新的资源迁移项目。
先读 agents/AGENTS.md、docs/ai-onboarding.md、docs/operating-playbook.md 和 templates/PROJECT_GUIDE.md。
不要连接真实后台，不要上传，不要改客户原始文件。
先运行 npm run smoke，然后用 init-project 建一个演示工作区。
接着根据 docs/ai-onboarding.md 输出“项目适配清单”和“上线前缺口”。
只有模拟流程跑通、PROJECT_GUIDE/HANDOFF/PROGRESS/ledger 填完整、人工确认目标后台和停线规则后，才允许讨论真实后台适配器。
```

这套框架的第一目标是让 AI 在 15-30 分钟内完成三件事：

1. 跑通脱敏演示，知道完整闭环长什么样。
2. 初始化一个新项目工作区，知道必须填哪些项目事实。
3. 列出真实项目上线前缺口，而不是直接碰后台。

## 平台实战层

同事的 AI 在真实上传前必须阅读：

- `docs/platform-profile-resource-center.md`
- `docs/runbooks/video-upload-runbook.md`
- `docs/runbooks/document-upload-runbook.md`
- `docs/runbooks/image-upload-runbook.md`
- `docs/object-storage-adapter-pseudocode.md`

这些文件沉淀的是致趣百川「内容中心 > 资源库上传」场景的实战经验。公开版会写明适用平台和模块，但不暴露后台 URL、私有接口、登录信息、客户数据或历史日志；保留资源中心页签、大小限制、并发边界、对象存储式上传、后台记录创建、精确搜索验证和失败停线经验。

## 仓库内容

- `agents/`：给 Codex / Claude Code 的入口规则。
- `skills/resource-migration/`：可安装到 Codex skills 的轻量技能。
- `templates/`：新项目复制用的交接、项目指南、进度、台账和汇报模板。
- `docs/`：流程、架构、适配器接口、脱敏规则。
- `examples/sanitized-project/`：脱敏示例项目。
- `src/`：最小可运行 CLI、CSV 工具、文件检查和模拟后台适配器。

## 安全边界

公开仓库只放通用框架和脱敏示例。真实项目中应把以下内容放在私有目录或私有仓库：

- 后台 URL、接口路径、登录方式、cookie、token。
- 客户名称、真实文件名、真实源链接、资源 ID。
- 原始 Excel、真实台账、上传日志、后台快照。
- 平台专用上传适配器。

明确禁止：把真实客户项目目录直接复制进公开仓库；把真实后台接口、cookie、token、资源 ID 或日志作为 issue/PR 附件上传。

## 适用场景

当前明确适用于致趣百川内容中心板块的资源库上传，支持三类资源：

- 图片。
- 视频。
- 文档。

也适合需要把大量图片、视频、文档迁移到相似后台资源中心或内容库，并且希望 AI 代理能协助规划、上传、核查、回填和汇报的项目。

不适合无台账、无验证标准、无法拿到后台结果证据的“黑盒批量搬运”。
