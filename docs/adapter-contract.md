# 后台适配器约定

后台适配器是唯一允许知道目标系统细节的层。

## 必需方法

```ts
type ResourceTask = {
  source_row_id: string;
  resource_name: string;
  resource_type: "document" | "image" | "video" | "other";
  relative_path: string;
};

type BackendMatch = {
  backend_id: string;
  backend_name: string;
  resource_type: string;
  evidence: string;
};

type UploadResult = {
  source_row_id: string;
  status: "uploaded-verified" | "upload-failed" | "verification-failed";
  backend_id?: string;
  backend_name?: string;
  evidence: string;
  error?: string;
};
```

适配器应实现：

- `snapshot()`
- `exactSearch(task)`
- `upload(task, localFile)`
- `verify(task, uploadResponse)`

## 安全要求

- `upload()` 不能单独标记成功。
- `verify()` 必须返回可查询的后台证据。
- 失败或超时的上传，必须先通过精确搜索核对后台状态，再允许重试。
- 删除、替换、重命名、移动等破坏性后台操作不属于本框架范围，除非另行审查。
