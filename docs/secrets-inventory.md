# 密钥清单

记录所有密钥/敏感配置的名称、存放位置、用途和轮换情况。**本文件不含真实密钥值。**

## 存放位置说明

| 位置 | 用途 | 是否提交到git |
|---|---|---|
| `.env.example` | 变量清单+说明，占位符 | ✅ 提交 |
| `.env` | 本地开发环境 | ❌ gitignore |
| `.env.production`（服务器 `/var/www/circulink/.env`） | 生产环境 | ❌ gitignore，权限600 |
| GitHub Actions Secrets | 预留给未来CI/CD自动部署 | 存在GitHub仓库设置里 |

## 密钥列表

| 变量名 | 用途 | 访问范围 | 最近轮换 | 备注 |
|---|---|---|---|---|
| `JWT_SECRET` | 用户登录token签名 | 生产服务器 | 2026-08-23 | 因历史git泄露已轮换 |
| `JWT_REFRESH_SECRET` | refresh token签名 | 生产服务器 | 2026-08-23 | 因历史git泄露已轮换 |
| `DATABASE_URL` | 数据库连接串 | 生产服务器 | — | 走Unix socket peer认证，无密码，历史泄露的密码字段不构成实际风险 |
| `OPENAI_API_KEY` | LLM服务调用 | 生产服务器 | 未轮换 | 未发现历史泄露 |
| `DM_SMTP_PASS` | 阿里云邮件推送SMTP密码 | 生产服务器 | 未轮换 | 未发现历史泄露，未纳入本次排查（历史`.env`快照中不含该变量） |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2对象存储访问凭证 | 生产服务器 | 2026年8月（R2迁移时新建） | 迁移时新建的独立token，未出现在早期泄露的`.env`中 |
| `VITE_TEST_EMAIL` / `VITE_TEST_PASSWORD` | 本地开发测试账号 | 仅本地`.env` | — | 非生产凭证，风险低 |

## 已知历史事件

- **2026-01（3个commit）**：早期开发阶段，真实`.env`（含真实`JWT_SECRET`/`JWT_REFRESH_SECRET`/`DATABASE_URL`等）曾被误提交到git历史。仓库为Private，风险范围限于协作者。
  - 处理方式：未重写git历史（成本过高），改为轮换受影响的密钥。
  - `JWT_SECRET`/`JWT_REFRESH_SECRET`：已于2026-08-23轮换。
  - `DATABASE_URL`：确认生产环境走peer认证不依赖密码字段，泄露的密码本身不构成实际访问风险，无需操作。

## 待办

- [ ] 定期（如每学期一次，或人员变动时）轮换 `JWT_SECRET`
- [ ] 上线前确认 `.env`/`.env.production` 权限保持 `600`
- [ ] 若未来接入SMTP自动发信，评估 `DM_SMTP_PASS` 是否需要单独走轮换流程
