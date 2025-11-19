#!/usr/bin/env node
import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

// 确保路径正确，处理 Windows 下的反斜杠问题
const HOME_DIR = os.homedir();
const DB_PATH = path.join(HOME_DIR, '.chrono-mcp', 'chrono.db');

try {
  // 必须配置 timeout，防止数据库繁忙时脚本卡死终端
  const db = new Database(DB_PATH, { timeout: 1000 });
  
  const [,, command, cwd, exitCode, sessionId] = process.argv;
  
  // 过滤掉空命令或仅仅是回车的命令
  if (command && command.trim().length > 0) {
    const stmt = db.prepare(`
      INSERT INTO terminal_history (command, cwd, exit_code, timestamp, session_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(command, cwd, parseInt(exitCode || '0'), Date.now(), sessionId || 'unknown');
  }
} catch (e) {
  // 绝对静默，Do no harm
}