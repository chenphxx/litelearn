# litelearn

基于tauri开发的一款数据库查询软件 

## 功能

- **记录功能**, 可针对不同技术栈, 记录知识点, 方便后续查找 

- **导出**, 支持导出为`markdown`文件 

- **可视化**, 可快捷新增/编辑/删除内容 

## 快速开始

确保本机`MySQL`正在运行, 应用会自动创建`litelearn`数据库 

在终端中按顺序执行以下命令 

```bash
npm install
npm run tauri dev
```

## 构建安装包

```bash
npm run tauri build
```

安装包位于`src-tauri/target/release/bundle/` 

## 数据库配置

- 默认连接: `127.0.0.1:3306`, 用户`root`, 数据库`litelearn`; 
  密码不提供默认值, 请通过应用内`设置`保存, 或使用环境变量`LITELEARN_DB_PASSWORD`指定 

- 应用内点击`设置`可修改连接信息, 保存后自动重连; 配置保存在 `%APPDATA%/com.litelearn.app/config.json` 

- 支持环境变量覆盖配置(优先级高于配置文件): 

  | 环境变量                | 说明       |
  | ----------------------- | ---------- |
  | `LITELEARN_DB_HOST`     | 数据库地址 |
  | `LITELEARN_DB_PORT`     | 端口       |
  | `LITELEARN_DB_USER`     | 用户名     |
  | `LITELEARN_DB_PASSWORD` | 密码       |
  | `LITELEARN_DB_NAME`     | 数据库名   |

## 文档

见`docs/` 
