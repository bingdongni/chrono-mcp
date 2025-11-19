// src/browser.ts
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { db } from './db.js';

function getChromeHistoryPath(): string | null {
  const home = os.homedir();
  const platform = os.platform();

  let paths: string[] = [];

  if (platform === 'darwin') {
    paths = [
      path.join(home, 'Library/Application Support/Google/Chrome/Default/History'),
      path.join(home, 'Library/Application Support/Google/Chrome/Profile 1/History'), // 支持多配置
    ];
  } else if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    paths = [
      path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'History'),
    ];
  } else if (platform === 'linux') {
    paths = [
      path.join(home, '.config', 'google-chrome', 'Default', 'History'),
    ];
  }

  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function syncBrowserHistory() {
  const historyPath = getChromeHistoryPath();
  if (!historyPath) {
    // 静默返回，避免没有安装 Chrome 的用户报错
    return; 
  }

  const tempDbPath = path.join(os.tmpdir(), `chrono_chrome_${Date.now()}.db`);

  try {
    await fs.copy(historyPath, tempDbPath);
    
    const browserDb = new (await import('better-sqlite3')).default(tempDbPath);
    
    const rows = browserDb.prepare(`
      SELECT url, title, last_visit_time 
      FROM urls 
      ORDER BY last_visit_time DESC 
      LIMIT 100
    `).all() as any[];

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO browser_history (url, title, visit_time, source)
      VALUES (?, ?, ?, 'chrome')
    `);

    db.transaction(() => {
      for (const row of rows) {
        // Chrome webkit timestamp -> Unix timestamp
        const visitTimeMs = (row.last_visit_time / 1000) - 11644473600000;
        if (visitTimeMs > 0) { // 过滤无效时间
            insertStmt.run(row.url, row.title, visitTimeMs);
        }
      }
    })();

    browserDb.close();
  } catch (error) {
    // 忽略锁文件错误，保证 Server 不崩溃
  } finally {
    // 确保清理临时文件
    await fs.remove(tempDbPath).catch(() => {}); 
  }
}