# Repository Guidelines

LiteLearn is a Tauri 2 desktop snippet manager: a plain ES-module frontend in `src/` calls Rust commands in `src-tauri/`, which persist snippets in MySQL 9.

## Project Structure & Module Organization

- `index.html` -- the single page shell; UI elements are declared here with their `id`.
- `src/` -- `main.js` wires modules together, `api.js` wraps `invoke` calls, `state.js` holds shared state and the `actions` registry, `ui.js` covers DOM references, theme and dialogs. Feature modules: `results.js`, `detail.js`, `editor.js`, `stacks.js`, `snippet-form.js`, `recycle.js`, `history.js`, `sql.js`, `backup.js`, `connection.js`; styling is in `styles.css`.
- `src-tauri/src/` -- `lib.rs` registers commands, `commands.rs` implements every `#[tauri::command]`, `db.rs` owns the pool, DDL and schema migration, plus `models.rs`, `config.rs` and `backup.rs`.
- `docs/` -- `架构设计.md` and `数据库设计.md`, updated with behavior changes.
- `dist/` and `src-tauri/target/` are generated; never edit or commit them.

Adding a command means implementing it in `commands.rs`, registering it in `lib.rs` and wrapping it in `api.js`; new fields also need the DDL in `db.rs` and `docs/数据库设计.md` updated.

## Build, Test, and Development Commands

- `npm install` -- install frontend dependencies.
- `npm run tauri dev` -- Vite on the fixed port 1420 plus the Tauri window.
- `npm run build` -- Vite build into `dist/`, the quickest frontend check.
- `npm run tauri build` -- NSIS installer into `src-tauri/target/release/bundle/`.
- `cargo test` (run from `src-tauri/`) -- Rust unit tests.

Requires Node 18+, Rust stable and MySQL 9.

## Coding Style & Naming Conventions

- Indent with 4 spaces, never tabs.
- Put opening braces and brackets on their own line (Allman style) in JS, Rust, CSS and `tauri.conf.json`.
- Use `snake_case` for JS and Rust functions and variables, `PascalCase` for Rust types, `camelCase` for state fields, and kebab-case for DOM ids and CSS classes.
- Document public APIs with Doxygen blocks (`@brief`, `@param`, `@return`); comments, docs and commit descriptions are written in Chinese.
- No formatter config is checked in; `cargo fmt` and Prettier would move braces onto the same line, so format by hand to match surrounding code.

## Testing Guidelines

- Rust tests sit in `#[cfg(test)] mod tests` inside `db.rs` and `commands.rs`, named `test_<behavior>`, e.g. `test_import_round_trip`.
- Database tests are skipped unless `LITELEARN_RUN_DB_TEST=1` and `LITELEARN_DB_PASSWORD` are set; each uses a throwaway database (`litelearn_test`, `litelearn_migration_test`).
- No frontend test framework exists: run `npm run build` and verify the flow manually.
- Extend tests for backup import/export, schema migration and search parsing.

## Commit & Pull Request Guidelines

- Use Conventional Commits: `<type>: <description>`, a lowercase English type plus a concise Chinese description, e.g. `feat: 新增回收站批量清空` or `docs: 更新数据库设计文档`.
- Keep one purpose per commit and keep generated directories and credentials out of the diff; the database password comes from app settings or the `LITELEARN_DB_*` environment variables.
- Pull requests should name affected modules, list verification commands and results, link the related issue, and show screenshots for UI changes.
