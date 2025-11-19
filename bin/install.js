#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';

const spinner = ora();
const HOME = os.homedir();
const IS_WIN = os.platform() === 'win32';
const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// 修正 Windows 下的路径
const BUILD_INDEX = path.join(PROJECT_ROOT, 'build', 'index.js');
const RECORD_SCRIPT = path.join(PROJECT_ROOT, 'bin', 'record.js');

console.log(boxen(chalk.bold.cyan(' Chrono-MCP Installer '), { padding: 1, borderStyle: 'round' }));

async function install() {
  try {
    // 1. 初始化数据库
    spinner.start('Initializing Database Engine...');
    const { initDB } = await import('../build/db.js');
    initDB();
    spinner.succeed('Database ready.');

    // 2. 配置 Shell Hook
    spinner.start('Configuring Shell Hooks...');
    if (IS_WIN) {
      await setupPowerShell();
    } else {
      await setupZsh();
    }

    // 3. 配置 Claude Desktop
    spinner.start('Connecting to Claude Desktop...');
    await setupClaude();

    console.log('\n' + boxen(chalk.green(`✅ Installation Complete!`), { padding: 1, borderStyle: 'double' }));
    console.log(chalk.yellow(`👉 Please Restart your Terminal and Claude Desktop to apply changes.`));
    
  } catch (error) {
    spinner.fail('Installation failed.');
    console.error(error);
  }
}

async function setupPowerShell() {
  // 查找 PowerShell Profile
  const psPaths = [
    path.join(HOME, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1'),
    path.join(HOME, 'Documents', 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1'),
  ];
  
  // 确保目录存在
  const profilePath = psPaths[0];
  await fs.ensureFile(profilePath);

  const currentContent = await fs.readFile(profilePath, 'utf-8');
  if (currentContent.includes('Chrono-MCP')) {
    spinner.info('PowerShell hook already exists. Skipping.');
    return;
  }

  // 这里的路径转义非常关键
  const recordScriptSafe = RECORD_SCRIPT.replace(/\\/g, '\\\\');
  const nodePath = 'node'; 

  const hook = `
# --- Chrono-MCP Windows Hook Start ---
function Prompt {
    $lastHistory = Get-History -Count 1
    if ($lastHistory) {
        $cmd = $lastHistory.CommandLine -replace '"', '\\"'
        $cwd = $PWD.Path
        Start-Process -FilePath "${nodePath}" -ArgumentList "${recordScriptSafe}", "\`"$cmd\`"", "\`"$cwd\`"", "0", "$PID" -WindowStyle Hidden
    }
    return "PS $($executionContext.SessionState.Path.CurrentLocation)> "
}
# --- Chrono-MCP Windows Hook End ---
`;

  await fs.appendFile(profilePath, hook);
  spinner.succeed(`PowerShell hook added to: ${profilePath}`);
}

async function setupZsh() {
  const zshrc = path.join(HOME, '.zshrc');
  if (!fs.existsSync(zshrc)) return;
  
  const content = await fs.readFile(zshrc, 'utf-8');
  if (content.includes('Chrono-MCP')) return;

  const hook = `
# --- Chrono-MCP Start ---
__chrono_precmd() {
  (node "${RECORD_SCRIPT}" "$(fc -ln -1)" "$(pwd)" "$?" "$$" &) >/dev/null 2>&1
}
autoload -Uz add-zsh-hook
add-zsh-hook precmd __chrono_precmd
# --- Chrono-MCP End ---
`;
  await fs.appendFile(zshrc, hook);
  spinner.succeed('Zsh hook added.');
}

async function setupClaude() {
  // 自动检测 Claude 配置路径
  const configPathWin = path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
  const configPathMac = path.join(HOME, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  const configPath = IS_WIN ? configPathWin : configPathMac;

  if (!fs.existsSync(configPath)) {
     await fs.ensureFile(configPath);
     await fs.writeJson(configPath, { mcpServers: {} });
  }

  const config = await fs.readJson(configPath);
  
  // 注入 Chrono 配置
  config.mcpServers = config.mcpServers || {};
  config.mcpServers['chrono'] = {
    command: 'node',
    args: [BUILD_INDEX]
  };

  await fs.writeJson(configPath, config, { spaces: 2 });
  spinner.succeed(`Claude config updated at: ${configPath}`);
}

install();