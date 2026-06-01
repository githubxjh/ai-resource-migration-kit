# 发布检查清单

推送公开仓库前先跑完这份检查清单。

## 内容

- README 没有出现真实客户名，并能说明项目用途。
- 示例使用虚构文件和模拟后台 ID。
- 模板保持通用，不引用真实后台。
- 文档说明安全边界和停线规则。
- 许可证文件存在。

## 敏感信息扫描

搜索：

```powershell
Select-String -Path .\**\* -Pattern 'http://|https://|cookie|token|authorization|secret|客户|后台ID|D:\\' -CaseSensitive:$false
```

人工复核命中项。公开文档可以包含 `https://example.invalid` 这类占位 URL，但不能包含真实系统。

## 冒烟测试

```powershell
npm run smoke
```

预期结果：

```text
冒烟测试通过
```

## 同事 AI 验收

在告诉同事“可以用于真实项目前”，用一个全新的 AI 会话跑 `docs/teammate-acceptance-test.md`。

## 人工复核

请一位同事初始化演示项目，并让对方说明：

- 什么才算完成。
- 什么时候代理必须停线。
- 交接状态存在哪里。
- 为什么模拟适配器输出不能当作真实后台证明。
