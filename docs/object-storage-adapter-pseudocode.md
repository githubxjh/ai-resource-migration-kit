# 类对象存储适配器伪代码

这是一份可公开的伪代码，适用于“先上传到对象存储，再创建资源中心记录”的平台。

不要把真实接口路径、域名、token 或请求头放进公开仓库。

## 接口

```ts
type UploadToken = {
  token: string;
  expiresAt?: string;
  uploadHost?: string;
};

type ObjectUploadResult = {
  objectKey: string;
  sizeBytes: number;
  etag?: string;
  evidence: string;
};

type ResourceRecord = {
  backendId: string;
  backendName: string;
  link?: string;
  evidence: string;
};
```

## 伪代码

```ts
async function uploadResource(task, localFile) {
  assertConfirmedWorkspaceAndTab(task.resourceType);
  assertEligibleForUpload(task, localFile);

  const before = await exactSearchResource(task.resourceName, task.resourceType);
  recordEvidence("before-search", before);

  const token = await getUploadToken(task.resourceType);
  if (tokenExpiredOrTooClose(token)) {
    return partialUnknown(task, "上传 token 已过期或不安全");
  }

  const objectResult = await uploadObjectStorageLike(token, localFile);
  recordEvidence("object-upload", objectResult);

  // 还没有完成。对象存储成功只代表字节已传输。
  const resource = await createResourceRecord(task, objectResult);
  recordEvidence("resource-create", resource);

  const verified = await exactSearchResource(resource.backendName, task.resourceType);
  if (!hasBackendId(verified, resource.backendId)) {
    return verificationFailed(task, "精确搜索找不到资源记录");
  }

  if (task.resourceType === "document") {
    const link = await checkLinkHealth(resource.link);
    if (!link.ok) return verificationFailed(task, "链接健康检查失败");
  }

  return uploadedVerified(task, resource);
}
```

## 必需函数

- `getUploadToken(resourceType)`
- `uploadObjectStorageLike(token, localFile)`
- `createResourceRecord(task, objectResult)`
- `exactSearchResource(name, resourceType)`
- `checkLinkHealth(link)`

## 失败映射

| 现象 | 状态 |
|---|---|
| Token 已过期或上传过程中将过期 | `partial-unknown` |
| Runtime/base64 超时 | `partial-unknown` |
| 对象存储成功但资源记录创建失败 | `uploaded-object-only` |
| 创建资源记录有返回，但精确搜索找不到 ID | `resource-created-unverified` 或 `verification-failed` |
| 文档链接返回 404 或等价错误 | `verification-failed` |
| 名称超过已确认的平台限制 | `blocked-name-limit` 或 `needs-short-name` |
| 文件超过平台大小限制 | `blocked-size-limit` |

## 重试规则

只有精确搜索或快照证据证明后台记录是否存在后，才允许重试。状态不明不等于可以重试。
