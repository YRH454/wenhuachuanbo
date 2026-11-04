# Railway 部署说明

项目使用一个 Python 服务同源提供静态网页和小齐接口。`railway_server.py` 使用 Waitress 监听 Railway 分配的 `PORT`，`/healthz` 是不含敏感信息的健康检查。它与仅供本机使用的 `museum_assistant_server.py` 分开，不需要更改本机预览方式。

## 建议先做受保护预览

1. 由仓库所有者连接 GitHub 仓库并在 Railway 创建服务，部署 `main` 分支。创建 Railway 域名后确认服务正常；不要把密钥写入仓库、前端文件、截图、聊天、日志或命令行。
2. 在 Railway 的服务端变量界面由项目所有者设置 `SITE_PREVIEW_PASSWORD`（至少 12 个字符、随机且独立的密码）；访客访问整站时用户名为 `viewer`。它是 HTTPS 下的基础访问保护，不是完整的身份系统，密码不应公开分享。
3. 先在模型服务商处轮换曾在聊天中暴露过的旧密钥，并设置提供商侧支出或调用限额；然后将新密钥仅填入 Railway 的服务端机密变量 `DASHSCOPE_API_KEY`。未设置密钥时网页可用，但模型接口会提示尚未配置，不能视为 AI 部署成功。
4. Railway 生成域名后通常会提供 `RAILWAY_PUBLIC_DOMAIN`。如需指定单个自定义域名，在服务端设置 `PUBLIC_ORIGIN=https://你的域名`；仅接受一个 HTTPS 来源。域名更改后需确认变量和服务重启生效。接口严格校验请求的 Host 和 Origin，不信任用户传入的代理头。
5. 用线上地址依次验证首页、16 市、博物馆图片、场景讲解、提问、页面切换、移动端和错误提示。先使用模拟模型做自动测试，再在提供商侧限制费用后进行真实调用；只看首页或健康检查不能证明 AI 工作正常。

只有提供密码或显式设置 `PUBLIC_AI_ENABLED=true` 才会启用模型调用。若没有预览密码，后者会允许任何人访问 AI 接口，**同源校验不是身份验证**，可能产生模型费用。不要在未确认访问范围和支出限制时开启。

服务的并发、每分钟、每小时及每日请求保护只在单个运行进程内有效，重启或多实例会重置或分别计数，不能作为费用封顶、安全认证或大规模上线防滥用方案。正式公开前应另行配置可信的访问控制、跨实例持久限额、供应商侧预算、监控和告警；保持单实例不等于费用被严格限制。

## 素材与说明

项目负责人已确认本次使用的博物馆图片可以上传；图片来源、署名和历史核验状态见 [素材说明](dist/museum/PUBLIC-ASSETS.md) 与 [来源记录](dist/museum/SOURCES.md)。这项确认不等于本次部署独立审核了每张图片的使用权。地图边界、审图要求和文化资料仍应按实际发布与比赛要求核验。

城市和地图背景包含 AI 创意画面，不应当作真实历史现场。模型回答及资料链接也不保证完全准确。模型对选中画面进行讲解时，服务端可能将相应图片和用户问题发送给模型服务商。

## 本地测试

```bash
python -m pip install -r requirements.txt
python -m unittest test_railway_server test_museum_assistant_server
node --test test_navigation.mjs test_backgrounds.mjs test_zibo_guide.mjs test_competition_copy.mjs test_xiaoqi_guide.mjs test_xiaoqi_motion.mjs test_distribution.mjs test_museum.mjs
```

这些测试使用模拟回答，不调用付费模型。通过测试不代表已实际部署、模型已连接或公开版本已经验收。
