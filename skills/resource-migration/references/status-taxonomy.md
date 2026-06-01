# 状态分类

使用短且稳定的状态码。优先使用基于证据的状态，不使用乐观标签。

## 已完成

- `uploaded-verified`：已上传，并由后台 ID 或等价可查询证据验证。
- `existing-reused`：已有后台资源经哈希/同源/人工证明后被复用。

## 待处理

- `download-ready`：源任务可进入下载或本地解析。
- `local-verified`：本地文件存在、非 0 字节，并通过基础检查。
- `upload-candidate`：本地和后台预检查表明该行可考虑上传。
- `candidate`：本地文件存在，可进入上传前检查。
- `needs-download`：源清单行没有精确本地文件。
- `needs-review`：上传或复用前需要人工决策。
- `needs-short-name`：平台名称限制或链接行为要求 staged copy 使用客户可识别短名。

## 已阻塞

- `blocked-size-limit`：文件超过已验证的后台大小限制。
- `blocked-format`：文件格式不支持，或文件头无效。
- `blocked-missing-file`：缺少必需文件。
- `blocked-zero-byte`：本地文件为空。
- `blocked-backend`：后台登录态、渠道、页签或 API 状态不安全。
- `blocked-name-limit`：资源名超过已确认平台限制，且没有批准的短名。

## 失败或未验证

- `uploaded-object-only`：字节已到对象存储，但没有验证到后台资源记录。
- `resource-created-unverified`：后台创建调用有返回，但缺精确搜索/链接验证。
- `upload-failed`：上传尝试失败，且没有验证到后台记录。
- `verification-failed`：上传看似成功，但后台 ID/链接/搜索验证失败。
- `partial-unknown`：运行超时或只返回部分证据；重试前必须先核对。

只有 `uploaded-verified` 和 `existing-reused` 算完成状态。
