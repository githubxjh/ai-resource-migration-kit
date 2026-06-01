# 架构

这个框架把迁移工作拆成五类职责。

## SourceAdapter

读取源 Excel、CSV 或 JSON，并输出标准化任务行。

必需字段：

- `source_row_id`
- `resource_name`
- `resource_type`
- `source_url`
- `relative_path`

## StorageAdapter

查找或下载文件，并返回本地证据：

- 本地路径
- 文件大小
- 扩展名
- 可选的文件签名
- 可选的哈希值

## BackendAdapter

负责目标系统相关行为：

- 只读快照
- 精确搜索
- 上传
- 上传后验证

真实后台适配器在完全脱敏前必须保留在私有项目里。

## LedgerWriter

写入任务级状态、后台证据、时间戳、操作人和备注。

## ReportExporter

生成内部审计报告和客户核查报告。客户核查报告应去掉本地路径、堆栈、token 和私有后台细节。
