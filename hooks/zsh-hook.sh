# Chrono-MCP Zsh Hook
# 将此文件 source 到你的 .zshrc 中

autoload -Uz add-zsh-hook

__chrono_preexec() {
  __chrono_timer=$(date +%s%3N)
}

__chrono_precmd() {
  local exit_code=$?
  # 获取上一条命令
  local last_cmd=$(fc -ln -1)
  
  # 获取当前目录
  local cwd=$(pwd)
  
  # 使用 Node 脚本异步写入数据库，不阻塞当前 Shell
  # 假设 record.js 已经 link 到了全局或者绝对路径
  # 这里需要用户修改为实际路径，或者发布 npm 包后使用 chrono-record
  
  # 这里的路径需要根据实际部署修改，或者使用 npm link 后的全局命令
  (node ~/path/to/chrono-mcp/bin/record.js "$last_cmd" "$cwd" "$exit_code" "$$" &) >/dev/null 2>&1
}

add-zsh-hook preexec __chrono_preexec
add-zsh-hook precmd __chrono_precmd