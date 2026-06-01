# 恢复与回滚

资源迁移工作通常无法在后台安全“回滚”。更现实的恢复策略是保留证据、备份和严格停线。

## 每个真实批次前

创建批次文件夹：

```text
workspace/batches/YYYYMMDD-HHMM-<scope>/
```

复制或生成：

- `ledger-before.csv`
- `backend-snapshot-before.json`
- `batch-plan.csv`
- `operator-notes.md`

## 批次执行中

写入只追加证据：

- 上传尝试日志
- 后台响应摘要
- 精确搜索结果
- 链接健康检查结果，如适用

## 批次结束后

写入：

- `upload-results.json`
- `ledger-after.csv`
- `backend-snapshot-after.json`
- `batch-summary.md`

更新根目录的 `HANDOFF.md` 和 `PROGRESS.md`。

## 如果上传失败

1. 停线。
2. 记录错误、时间、资源行、本地文件、后台页签和可见页面/API 状态。
3. 运行精确搜索或快照，判断后台记录是否存在。
4. 如果没有后台记录，标记 `upload-failed` 或 `partial-unknown`。
5. 如果有后台记录但验证不完整，标记 `verification-failed` 并记录缺失的证明。
6. 在失败模式分类前，不要重试。

## 如果怀疑后台状态错误

不要自动删除、替换、重命名或移动后台资源。

记录：

- 疑似错误资源 ID
- 触发问题的行
- 已上传文件
- 后台页签/工作区
- 证据截图或 API 输出

升级给人工负责人处理后台侧修正。

## 台账恢复

如果台账损坏：

1. 使用最新的 `ledger-before.csv` 备份。
2. 用 `backfill` 重放已验证的 `upload-results.json`。
3. 将重建后的台账与最新后台快照比对。
4. 把恢复步骤写入 `HANDOFF.md`。

绝不要只靠记忆重建完成状态。
