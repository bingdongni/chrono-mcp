import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { fileURLToPath } from 'url';
const HOME_DIR = os.homedir();
const DATA_DIR = path.join(HOME_DIR, '.chrono-mcp');
const DB_PATH = path.join(DATA_DIR, 'chrono.db');
fs.ensureDirSync(DATA_DIR);
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
export function initDB() {
    console.error(`🔋 Initializing Chrono Engine at ${DB_PATH}...`);
    try {
        // 1. 基础存储表
        db.exec(`
      CREATE TABLE IF NOT EXISTS terminal_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command TEXT,
        cwd TEXT,
        exit_code INTEGER,
        timestamp INTEGER,
        session_id TEXT
      );
    `);
        // 2. FTS5 全文检索引擎 (核心升级)
        // 创建虚拟表，专门用于高性能搜索
        db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS terminal_fts USING fts5(command, cwd, content='terminal_history', content_rowid='id');
    `);
        // 3. 创建触发器：当基础表更新时，自动同步到搜索引擎索引
        db.exec(`
      CREATE TRIGGER IF NOT EXISTS terminal_ai_insert AFTER INSERT ON terminal_history BEGIN
        INSERT INTO terminal_fts(rowid, command, cwd) VALUES (new.id, new.command, new.cwd);
      END;
      CREATE TRIGGER IF NOT EXISTS terminal_ai_delete AFTER DELETE ON terminal_history BEGIN
        INSERT INTO terminal_fts(terminal_fts, rowid, command, cwd) VALUES('delete', old.id, old.command, old.cwd);
      END;
    `);
        // 4. 浏览器表
        db.exec(`
      CREATE TABLE IF NOT EXISTS browser_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT,
        title TEXT,
        visit_time INTEGER,
        source TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_browser_time ON browser_history(visit_time);
    `);
        // 5. 浏览器 FTS 索引
        db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS browser_fts USING fts5(title, url, content='browser_history', content_rowid='id');
      CREATE TRIGGER IF NOT EXISTS browser_ai_insert AFTER INSERT ON browser_history BEGIN
        INSERT INTO browser_fts(rowid, title, url) VALUES (new.id, new.title, new.url);
      END;
    `);
        console.error('✅ Smart Search Engine (FTS5) initialized.');
    }
    catch (error) {
        console.error('❌ Engine Error:', error);
    }
}
// Windows 兼容执行检查
const currentFilePath = fileURLToPath(import.meta.url);
const executedFilePath = process.argv[1];
if (executedFilePath && (executedFilePath.endsWith('db.ts') || executedFilePath.endsWith('db.js'))) {
    initDB();
}
