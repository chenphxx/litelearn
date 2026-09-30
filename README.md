# litelearn

基于tauri开发的一款数据库查询软件 

## 环境要求

- Node.js 18+ 
- Rust stable(建议 1.97+) 
- MySQL 9.x(本地或远程均可) 

## 快速开始

### 准备数据库

首次运行前只需准备可用的 MySQL 服务与账号, 应用会自动创建 `litelearn` 数据库及 
`stacks`, `snippets` 两张表, 无需手动执行建表语句, 表结构说明见 `docs/数据库设计.md` 

### 安装前端依赖

```bash
npm install
```

### 开发运行

```bash
npm run tauri dev
```

### 构建打包

```bash
npm run tauri build
```

安装包输出于 `src-tauri/target/release/bundle/` 

## 数据库配置

- 默认连接: `127.0.0.1:3306`, 用户 `root`, 数据库 `litelearn`; 
  密码不提供默认值, 请通过应用内 `设置` 保存, 或使用环境变量 `LITELEARN_DB_PASSWORD` 指定 

- 应用内点击 `设置` 可修改连接信息, 保存后自动重连; 配置保存在 
  `%APPDATA%/com.litelearn.app/config.json` 

- 支持环境变量覆盖配置(优先级高于配置文件): 
  
  | 环境变量                    | 说明    |
  | ----------------------- | ----- |
  | `LITELEARN_DB_HOST`     | 数据库地址 |
  | `LITELEARN_DB_PORT`     | 端口    |
  | `LITELEARN_DB_USER`     | 用户名   |
  | `LITELEARN_DB_PASSWORD` | 密码    |
  | `LITELEARN_DB_NAME`     | 数据库名  |

## 文档

见`docs/` 
