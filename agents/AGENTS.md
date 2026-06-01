# AGENTS.md - 资源迁移代理入口

Codex 或其他代码代理进入资源迁移项目时，先读本文件。

## 使命

把源清单和本地/已下载文件中的资源迁移到目标后台，同时避免重复上传、上传到错误渠道、未验证就标记完成，以及误改已有后台资源。

## 启动顺序

每次新会话在规划或执行前，按顺序读取：

1. `HANDOFF.md` - 最新断点和当前队列。
2. `PROJECT_GUIDE.md` - 项目约束和后台边界。
3. `PROGRESS.md` - 历史进度和决策。
4. `ledger.csv` - 当前任务级事实源。
5. 如果存在目标后台适配器文档，也要读取。

不要只凭聊天记忆继续。

## 平台实战层

规划真实资源操作前，读取：

1. `docs/platform-profile-resource-center.md`
2. `docs/runbooks/` 下匹配的 runbook
3. 如果上传采用“类对象存储传输 + 后台创建资源记录”的模式，读取 `docs/object-storage-adapter-pseudocode.md`

## 强制模拟门禁

实现或使用任何真实后台适配器前：

1. 运行仓库冒烟测试。
2. 用模板初始化私有项目工作区。
3. 端到端跑通模拟流程。
4. 填写 `PROJECT_GUIDE.md`、`HANDOFF.md` 和 `PROGRESS.md`。
5. 按 `docs/ai-onboarding.md` 输出真实上线准备度评审。

任一门禁缺失时，不要上传到真实后台。

真实上传前，先产出批次计划，包含资源类型、大小分桶、并发策略、验证方法和停线条件。

## 证据规则

- 以源清单的每一行作为任务单位。
- 不要仅因文件名相似就合并任务。
- 上传成功必须有后台 ID 或等价可查询证据。
- UI 成功提示、已选文件名和原生 input 状态都不够。
- 如果后台验证失败，停线、记录证据，不要标记成功。
- 如果登录态、渠道、页签、资源类型或重复状态不清楚，上传前先停线。

## 操作规则

- 永远不要修改原始源表格。
- 所有进度写在项目工作区文件中。
- 除非后台适配器明确证明安全并发，否则上传必须串行。
- 不改后台状态的下载和本地检查可以并行。
- 暂停前更新 `HANDOFF.md`、`PROGRESS.md`、`ledger.csv` 和报告。

## 停线规则

以下动作前停线并请求人工确认：

- 本会话首次上传到真实后台。
- 点击删除、替换、重命名、移动或覆盖等破坏性动作。
- 在没有哈希/同源/人工证明时复用已有后台资源。
- 缩短或修改面向客户的资源名。
- 超时、部分上传、未知 API 错误或缺后台 ID 后重试。

## 推荐命令

```powershell
node .\src\cli\index.mjs doctor
node .\src\cli\index.mjs init-project --out .\workspace\demo --name DemoMigration
node .\src\cli\index.mjs plan --source .\source-list.csv --out .\workspace\ledger.csv
node .\src\cli\index.mjs verify-local --ledger .\workspace\ledger.csv --base . --out .\workspace\local-checks.json
node .\src\cli\index.mjs report --ledger .\workspace\ledger.csv --out .\workspace\report.md
```

真实后台适配器必须属于具体项目并保持私有，除非已完全脱敏。
