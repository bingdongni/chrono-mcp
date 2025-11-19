import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { db, initDB } from "./db.js";
import { syncBrowserHistory } from "./browser.js";
// 初始化数据库
initDB();
const server = new McpServer({
    name: "chrono-mcp",
    version: "1.1.0",
});
// 工具 1: 智能终端搜索 (Ranked Search)
server.tool("search_terminal_history", {
    query: z.string().describe("Natural language query (e.g. 'git error' or 'npm install')"),
    limit: z.number().optional().default(20),
}, async ({ query, limit }) => {
    // 将自然语言转换为 FTS 查询语法 (简单的分词匹配)
    const cleanQuery = query.replace(/[^a-zA-Z0-9\-_]/g, ' ').trim();
    const ftsQuery = cleanQuery.split(/\s+/).map(w => `"${w}"*`).join(' OR ');
    // 使用 BM25 算法进行相关性排序 (rank)
    const stmt = db.prepare(`
      SELECT 
        h.command, 
        h.cwd, 
        h.exit_code, 
        datetime(h.timestamp/1000, 'unixepoch', 'localtime') as time,
        fts.rank
      FROM terminal_fts fts
      JOIN terminal_history h ON fts.rowid = h.id
      WHERE terminal_fts MATCH ? 
      ORDER BY fts.rank ASC, h.timestamp DESC
      LIMIT ?
    `);
    // 🛠️ FIX: 明确指定类型为 any[]，并给一个初始值
    let results = [];
    try {
        results = stmt.all(ftsQuery, limit);
    }
    catch (e) {
        // 降级回退：如果 FTS 语法解析失败，回退到模糊搜索
        const fallback = db.prepare(`SELECT command, cwd FROM terminal_history WHERE command LIKE ? ORDER BY timestamp DESC LIMIT ?`);
        results = fallback.all(`%${query}%`, limit);
    }
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 工具 2: 智能浏览器搜索
server.tool("search_browser_history", {
    query: z.string(),
    limit: z.number().optional().default(10),
}, async ({ query, limit }) => {
    await syncBrowserHistory();
    // 同样使用 FTS
    const cleanQuery = query.replace(/[^a-zA-Z0-9\-_]/g, ' ').trim();
    const ftsQuery = cleanQuery.split(/\s+/).map(w => `"${w}"*`).join(' OR ');
    const stmt = db.prepare(`
      SELECT h.title, h.url, datetime(h.visit_time/1000, 'unixepoch', 'localtime') as time
      FROM browser_fts fts
      JOIN browser_history h ON fts.rowid = h.id
      WHERE browser_fts MATCH ?
      ORDER BY fts.rank ASC, h.visit_time DESC
      LIMIT ?
    `);
    // 🛠️ FIX: 明确指定类型为 any[]
    let results = [];
    try {
        results = stmt.all(ftsQuery, limit);
    }
    catch (e) {
        results = [];
    }
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 工具 3: 获取最近上下文
server.tool("get_recent_context", { minutes: z.number().default(60) }, async ({ minutes }) => {
    // 触发一次同步
    await syncBrowserHistory();
    const since = Date.now() - (minutes * 60 * 1000);
    const termLogs = db.prepare(`SELECT 'terminal' as type, command as content, cwd as context, timestamp FROM terminal_history WHERE timestamp > ?`).all(since);
    const browserLogs = db.prepare(`SELECT 'browser' as type, title as content, url as context, visit_time as timestamp FROM browser_history WHERE visit_time > ?`).all(since);
    // @ts-ignore: 忽略排序时的类型推断问题，因为我们知道结构是一样的
    const combined = [...termLogs, ...browserLogs].sort((a, b) => b.timestamp - a.timestamp);
    return {
        content: [{ type: "text", text: JSON.stringify(combined, null, 2) }],
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Chrono MCP Server running on stdio");
}
main();
