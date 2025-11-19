import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

// 1. 找到数据库路径
const dbPath = path.join(os.homedir(), '.chrono-mcp', 'chrono.db');
console.log(`正在检查数据库: ${dbPath}`);

try {
  // 2. 连接数据库
  const db = new Database(dbPath, { readonly: true });

  // 3. 查询最近的 5 条记录
  const rows = db.prepare('SELECT * FROM terminal_history ORDER BY id DESC LIMIT 5').all();

  // 4. 打印结果
  if (rows.length === 0) {
    console.log("❌ 数据库是空的！Hook 可能没生效。");
  } else {
    console.log("✅ 成功！读取到最近的记录：");
    console.table(rows);
  }
} catch (error) {
  console.error("❌ 读取失败:", error.message);
}