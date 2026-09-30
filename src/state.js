/**
 * @brief 全局界面状态
 *
 * 所有模块共享同一份状态, 由各模块读写后驱动界面重绘
 */
export const state = {
    /** 技术栈列表 */
    stacks: [],
    /** 当前技术栈编号, null 表示全部技术栈 */
    currentStackId: null,
    /** 当前搜索关键词 */
    keyword: "",
    /** 排序方式 */
    sort: "id_asc",
    /** 当前结果列表 */
    rows: [],
    /** 结果总数 */
    total: 0,
    /** 每页数量 */
    limit: 50,
    /** 是否正在检索 */
    loading: false,
    /** 当前文章编号 */
    currentSnippetId: null,
    /** 打开文章时的内容快照, 用于判断未保存修改 */
    snapshot: { zhIndex: "", enIndex: "", content: "" },
    /** 数据库连接状态 */
    connected: false,
    /** SQL 控制台只读模式 */
    sqlReadonly: true,
    /** 侧边栏是否折叠 */
    sidebarCollapsed: false,
};

/**
 * @brief 模块间动作注册表
 *
 * 由 main.js 在初始化阶段装配, 避免模块之间循环依赖
 */
export const actions = {
    /** 打开指定文章 */
    open_snippet: null,
    /** 按当前条件重新检索 */
    reload_results: null,
    /** 切换技术栈 */
    select_stack: null,
    /** 重新加载技术栈列表 */
    reload_stacks: null,
    /** 保存当前编辑内容 */
    save_current: null,
    /** 刷新连接状态 */
    refresh_connection: null,
    /** 存在未保存修改时确认是否继续 */
    confirm_leave: null,
    /** 打开新增数据弹窗 */
    open_new_snippet: null,
};
