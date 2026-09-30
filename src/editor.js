import { basicSetup } from "codemirror";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { Compartment } from "@codemirror/state";
import { indentWithTab } from "@codemirror/commands";
import {
    LanguageDescription,
    defaultHighlightStyle,
    syntaxHighlighting,
} from "@codemirror/language";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import { languages } from "@codemirror/language-data";
import { is_dark, ui } from "./ui.js";

/**
 * @brief 技术栈名称到编辑器语言的映射
 *
 * language 为 CodeMirror 语言名称, fence 为 Markdown 代码块标记
 */
const LANGUAGE_TABLE = {
    c: { language: "C", fence: "c" },
    cpp: { language: "C++", fence: "cpp" },
    "c++": { language: "C++", fence: "cpp" },
    csharp: { language: "C#", fence: "csharp" },
    "c#": { language: "C#", fence: "csharp" },
    java: { language: "Java", fence: "java" },
    javascript: { language: "JavaScript", fence: "javascript" },
    js: { language: "JavaScript", fence: "javascript" },
    typescript: { language: "TypeScript", fence: "typescript" },
    ts: { language: "TypeScript", fence: "typescript" },
    python: { language: "Python", fence: "python" },
    py: { language: "Python", fence: "python" },
    rust: { language: "Rust", fence: "rust" },
    go: { language: "Go", fence: "go" },
    golang: { language: "Go", fence: "go" },
    sql: { language: "SQL", fence: "sql" },
    mysql: { language: "SQL", fence: "sql" },
    html: { language: "HTML", fence: "html" },
    css: { language: "CSS", fence: "css" },
    json: { language: "JSON", fence: "json" },
    markdown: { language: "Markdown", fence: "markdown" },
    md: { language: "Markdown", fence: "markdown" },
    yaml: { language: "YAML", fence: "yaml" },
    yml: { language: "YAML", fence: "yaml" },
    shell: { language: "Shell", fence: "bash" },
    bash: { language: "Shell", fence: "bash" },
    sh: { language: "Shell", fence: "bash" },
    powershell: { language: "PowerShell", fence: "powershell" },
    ps1: { language: "PowerShell", fence: "powershell" },
    docker: { language: "Dockerfile", fence: "dockerfile" },
    dockerfile: { language: "Dockerfile", fence: "dockerfile" },
    php: { language: "PHP", fence: "php" },
    ruby: { language: "Ruby", fence: "ruby" },
    kotlin: { language: "Kotlin", fence: "kotlin" },
    swift: { language: "Swift", fence: "swift" },
    scala: { language: "Scala", fence: "scala" },
    lua: { language: "Lua", fence: "lua" },
    perl: { language: "Perl", fence: "perl" },
    r: { language: "R", fence: "r" },
    matlab: { language: "MATLAB", fence: "matlab" },
    xml: { language: "XML", fence: "xml" },
    vue: { language: "Vue", fence: "vue" },
};

/** 代码编辑器语言配置 */
const code_language = new Compartment();

/** 编辑器高亮配置 */
const code_highlight = new Compartment();

/** 代码编辑器实例 */
let editor_view = null;

/** 当前技术栈对应的语言定义 */
let current_language = null;

/** 程序化写入内容时抑制变更回调 */
let suppress_change = false;

/** 内容变更回调 */
let on_change = () => {};

/**
 * @brief 生成高亮扩展
 *
 * 深色主题使用 oneDark 的语法配色, 浅色主题使用默认配色
 *
 * @return 高亮扩展
 */
function highlight_extension()
{
    return is_dark()
        ? syntaxHighlighting(oneDarkHighlightStyle)
        : syntaxHighlighting(defaultHighlightStyle, { fallback: true });
}

/**
 * @brief 编辑器公共样式与行为扩展
 *
 * @param hint 占位提示
 * @return 扩展列表
 */
function base_extensions(hint)
{
    return [
        basicSetup,
        keymap.of([indentWithTab]),
        placeholder(hint),
        EditorView.lineWrapping,
        EditorView.theme({
            "&": {
                height: "100%",
                fontSize: "var(--content-font-size, 13px)",
                backgroundColor: "transparent",
                color: "var(--color-text)",
            },
            "&.cm-focused": { outline: "none" },
            ".cm-scroller": {
                fontFamily: "var(--font-code)",
                lineHeight: "1.6",
            },
            ".cm-content": { caretColor: "var(--color-primary)" },
            ".cm-gutters": {
                backgroundColor: "transparent",
                border: "none",
                color: "var(--color-text-light)",
            },
            ".cm-activeLine": { backgroundColor: "var(--color-hover)" },
            ".cm-activeLineGutter": { backgroundColor: "transparent" },
            ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
                backgroundColor: "var(--color-row-selected) !important",
            },
            ".cm-tooltip": {
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-panel)",
                color: "var(--color-text)",
            },
        }),
        EditorView.updateListener.of((update) =>
        {
            if (update.docChanged && !suppress_change)
            {
                on_change();
            }
        }),
    ];
}

/**
 * @brief 初始化正文编辑器
 *
 * @param change_handler 内容变更回调
 * @return 无
 */
export function init_editors(change_handler)
{
    on_change = typeof change_handler === "function" ? change_handler : () => {};
    editor_view = new EditorView({
        doc: "",
        extensions: [
            ...base_extensions("在此撰写知识点文章, 支持 Markdown 与代码块"),
            code_highlight.of(highlight_extension()),
            code_language.of([]),
        ],
        parent: ui.contentEditor,
    });
    document.addEventListener("theme-change", () =>
    {
        editor_view.dispatch({ effects: code_highlight.reconfigure(highlight_extension()) });
    });
}

/**
 * @brief 读取编辑器内容
 *
 * @return 正文内容
 */
export function get_content()
{
    return editor_view ? editor_view.state.doc.toString() : "";
}

/**
 * @brief 设置代码编辑器内容
 *
 * @param text 正文内容
 * @return 无
 */
export function set_content(text)
{
    if (!editor_view)
    {
        return;
    }
    suppress_change = true;
    editor_view.dispatch({
        changes: { from: 0, to: editor_view.state.doc.length, insert: text ?? "" },
    });
    suppress_change = false;
}

/**
 * @brief 正文行数
 *
 * @return 行数
 */
export function content_line_count()
{
    return editor_view ? editor_view.state.doc.lines : 0;
}

/**
 * @brief 按技术栈名称切换代码高亮语言
 *
 * @param stack_name 技术栈名称
 * @return 无
 */
export async function set_stack_language(stack_name)
{
    const key = String(stack_name ?? "").trim().toLowerCase();
    current_language = LANGUAGE_TABLE[key] || null;
    let support = [];
    if (current_language && current_language.language)
    {
        const description = LanguageDescription.matchLanguageName(
            languages,
            current_language.language,
            true,
        );
        if (description)
        {
            try
            {
                support = await description.load();
            }
            catch (error)
            {
                support = [];
            }
        }
    }
    if (editor_view)
    {
        editor_view.dispatch({ effects: code_language.reconfigure(support) });
    }
}

/**
 * @brief 获取技术栈对应的 Markdown 代码块标记
 *
 * @param stack_name 技术栈名称
 * @return 代码块标记, 未知技术栈时为空
 */
export function fence_for_stack(stack_name)
{
    const key = String(stack_name ?? "").trim().toLowerCase();
    const entry = LANGUAGE_TABLE[key];
    return entry ? entry.fence : "";
}

/**
 * @brief 聚焦代码编辑器
 *
 * @return 无
 */
export function focus_code()
{
    if (editor_view)
    {
        editor_view.focus();
    }
}
