<div align="center">

# ⏳ Chrono-MCP

### The "Second Brain" for Your AI Coding Assistant
**Infinite Context • Local Privacy • Instant Recall**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![MCP Ready](https://img.shields.io/badge/MCP-Compatible-green)](https://modelcontextprotocol.io/)
[![Windows | macOS | Linux](https://img.shields.io/badge/OS-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

[Features](#-features) • [Quick Start](#-quick-start) • [How it Works](#-how-it-works) • [Roadmap](#-roadmap)

---

![Chrono Demo](https://via.placeholder.com/800x400.png?text=Paste+Your+Demo+GIF+Here)

</div>

## 🚀 Why Chrono?

Your AI assistant (Claude, Cursor, Windsurf) is brilliant, but it has **amnesia**. It doesn't know:
* *"What was that ffmpeg command I ran 5 minutes ago?"*
* *"Which StackOverflow thread was I reading before I fixed this bug?"*
* *"What error message did I just get in the terminal?"*

**Chrono** bridges this gap. It is a local-first MCP server that silently indexes your **Terminal** and **Browser** history into a high-performance SQLite FTS5 search engine, giving your AI **instant recall** of your workflow.

## ✨ Features

- **🔍 Smart Full-Text Search (FTS5):** Built on SQLite's robust FTS5 engine using BM25 ranking. Forget `grep`—search naturally for keywords like *"git commit error"* or *"json parser"* to find commands you ran weeks ago.
- **🛡️ 100% Local & Private:** Your data is sacred. Everything is stored locally in `~/.chrono-mcp`. No cloud uploads, ever.
- **🐚 Zero-Latency Hooks:** Optimized asynchronous hooks for **PowerShell** (Windows) and **Zsh** (macOS/Linux). It records your history silently in the background without slowing down your terminal.
- **🔌 One-Click Setup:** Comes with an automated installer (`npm run install:cli`) that configures your Shell profile and Claude/Cursor config files automatically.

## ⚡ Quick Start

### Prerequisites
* Node.js (v18+)
* Claude Desktop or Cursor

### Option A: The Magic Installer (Recommended)

We provide an automated script that detects your OS, sets up the database, configures shell hooks, and connects to Claude.

```bash
# 1. Clone the repo
git clone [https://github.com/your-username/chrono-mcp.git](https://github.com/your-username/chrono-mcp.git)
cd chrono-mcp

# 2. Install dependencies & Build
npm install
npm run build

# 3. Run the Auto-Installer 🪄
npm run install:cli