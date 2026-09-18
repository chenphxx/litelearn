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

## 使用说明

- 顶部选择技术栈, 输入关键词后回车或点击 `搜索` 
- 输入纯数字可精确匹配片段编号; 输入 `000` 或留空查看全部 
- 点击左侧结果行, 在右侧查看/编辑代码与说明, 可复制, 保存, 删除 
- `新增数据` 向当前技术栈插入新片段; `新建技术栈` 创建新的分类 
- `导出备份` 可将全部数据导出为 JSON / CSV 文件, 保存位置可自定义 
- `导入备份` 可将导出的备份文件重新导入, 已存在的数据自动跳过, 不覆盖原有内容 
- 右上角可切换深色/浅色模式, 偏好会自动保存 
- `SQL 控制台` 支持执行单条 SQL 语句, 请谨慎操作 

## 项目文档

- `docs/架构设计.md`: 项目整体架构与实现方法 
- `docs/数据库设计.md`: 数据库表结构, 字段说明与检索设计 
