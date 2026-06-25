(function () {
  "use strict";

  const output = document.getElementById("output");
  const input = document.getElementById("input");
  const terminal = document.getElementById("terminal");

  const USER = "guest";
  const HOST = "webshell";

  // Command history
  const history = [];
  let historyIndex = -1;

  // A tiny virtual filesystem
  const fs = {
    "~": {
      type: "dir",
      children: {
        "readme.txt": {
          type: "file",
          content:
            "Welcome to WebShell!\nThis is a simulated terminal running in your browser.\nTry commands like: ls, cat readme.txt, echo hello, date.",
        },
        projects: {
          type: "dir",
          children: {
            "todo.md": {
              type: "file",
              content: "- [x] Build WebShell\n- [ ] Add more commands\n- [ ] Have fun",
            },
          },
        },
        "about.txt": {
          type: "file",
          content: "WebShell v1.0.0 — a shell website built with HTML, CSS, and JavaScript.",
        },
      },
    },
  };

  let cwd = ["~"]; // current path as array

  function getNode(pathArr) {
    let node = fs["~"];
    if (pathArr.length === 1 && pathArr[0] === "~") return node;
    for (let i = 1; i < pathArr.length; i++) {
      if (node.type !== "dir" || !node.children[pathArr[i]]) return null;
      node = node.children[pathArr[i]];
    }
    return node;
  }

  function cwdString() {
    return cwd.join("/").replace("~", "~");
  }

  function promptString() {
    return `${USER}@${HOST}:${cwdString()}$`;
  }

  function updatePrompt() {
    document.getElementById("prompt").textContent = promptString();
  }

  function scrollToBottom() {
    output.scrollTop = output.scrollHeight;
  }

  function print(html, className) {
    const div = document.createElement("div");
    div.className = "line" + (className ? " " + className : "");
    div.innerHTML = html;
    output.appendChild(div);
    scrollToBottom();
  }

  function echoCommand(cmd) {
    const div = document.createElement("div");
    div.className = "line";
    div.innerHTML =
      `<span class="cmd-prompt">${escapeHtml(promptString())}</span>` +
      `<span class="cmd">${escapeHtml(cmd)}</span>`;
    output.appendChild(div);
  }

  function isValidName(name) {
    return /^[A-Za-z0-9._-]+$/.test(name);
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ---- Commands ----
  const commands = {
    help() {
      const rows = Object.keys(commands)
        .sort()
        .map(
          (name) =>
            `<span class="name">${name}</span><span>${
              commandHelp[name] || ""
            }</span>`
        )
        .join("");
      print(`<div class="help-grid">${rows}</div>`);
    },

    ls() {
      const node = getNode(cwd);
      if (!node || node.type !== "dir") {
        print("ls: not a directory", "error");
        return;
      }
      const names = Object.keys(node.children);
      if (names.length === 0) {
        return;
      }
      const formatted = names
        .map((n) =>
          node.children[n].type === "dir"
            ? `<span class="accent">${n}/</span>`
            : n
        )
        .join("   ");
      print(formatted);
    },

    cd(args) {
      const target = args[0];
      if (!target || target === "~") {
        cwd = ["~"];
        updatePrompt();
        return;
      }
      if (target === "..") {
        if (cwd.length > 1) cwd.pop();
        updatePrompt();
        return;
      }
      const node = getNode(cwd);
      if (node && node.type === "dir" && node.children[target]) {
        if (node.children[target].type === "dir") {
          cwd.push(target);
          updatePrompt();
        } else {
          print(`cd: not a directory: ${escapeHtml(target)}`, "error");
        }
      } else {
        print(`cd: no such directory: ${escapeHtml(target)}`, "error");
      }
    },

    cat(args) {
      if (!args[0]) {
        print("cat: missing file operand", "error");
        return;
      }
      const node = getNode(cwd);
      const file = node && node.children && node.children[args[0]];
      if (file && file.type === "file") {
        print(escapeHtml(file.content));
      } else if (file && file.type === "dir") {
        print(`cat: ${escapeHtml(args[0])}: is a directory`, "error");
      } else {
        print(`cat: ${escapeHtml(args[0])}: no such file`, "error");
      }
    },

    pwd() {
      print(cwdString());
    },

    mkdir(args) {
      if (!args[0]) {
        print("mkdir: missing operand", "error");
        return;
      }
      const node = getNode(cwd);
      if (!node || node.type !== "dir") {
        print("mkdir: cannot create directory here", "error");
        return;
      }
      const name = args[0];
      if (!isValidName(name)) {
        print(`mkdir: invalid name: ${escapeHtml(name)}`, "error");
        return;
      }
      if (node.children[name]) {
        print(`mkdir: cannot create directory '${escapeHtml(name)}': File exists`, "error");
        return;
      }
      node.children[name] = { type: "dir", children: {} };
    },

    touch(args) {
      if (!args[0]) {
        print("touch: missing file operand", "error");
        return;
      }
      const node = getNode(cwd);
      if (!node || node.type !== "dir") {
        print("touch: cannot create file here", "error");
        return;
      }
      const name = args[0];
      if (!isValidName(name)) {
        print(`touch: invalid name: ${escapeHtml(name)}`, "error");
        return;
      }
      if (!node.children[name]) {
        node.children[name] = { type: "file", content: "" };
      }
    },

    rm(args) {
      const recursive = args.includes("-r") || args.includes("-rf");
      const target = args.filter((a) => !a.startsWith("-"))[0];
      if (!target) {
        print("rm: missing operand", "error");
        return;
      }
      const node = getNode(cwd);
      const entry = node && node.children && node.children[target];
      if (!entry) {
        print(`rm: cannot remove '${escapeHtml(target)}': No such file or directory`, "error");
        return;
      }
      if (entry.type === "dir" && !recursive) {
        print(`rm: cannot remove '${escapeHtml(target)}': Is a directory (use -r)`, "error");
        return;
      }
      delete node.children[target];
    },

    calc(args) {
      const expr = args.join(" ").trim();
      if (!expr) {
        print("calc: usage: calc <expression>  (e.g. calc 2 + 3 * 4)", "error");
        return;
      }
      // Only allow numbers, operators, parentheses, decimal points, spaces
      if (!/^[0-9+\-*/().%\s]+$/.test(expr)) {
        print("calc: invalid characters in expression", "error");
        return;
      }
      try {
        // Safe: input is restricted to arithmetic characters above
        const result = Function(`"use strict"; return (${expr});`)();
        if (typeof result !== "number" || !isFinite(result)) {
          print("calc: invalid expression", "error");
          return;
        }
        print(`${escapeHtml(expr)} = ${result}`, "success");
      } catch (e) {
        print("calc: invalid expression", "error");
      }
    },

    async weather(args) {
      const city = args.join(" ").trim() || "Berlin";
      print(`Fetching weather for ${escapeHtml(city)}...`, "muted");
      try {
        const res = await fetch(
          `https://wttr.in/${encodeURIComponent(city)}?format=%l:+%c+%t+(feels+%f),+%h+humidity,+wind+%w`
        );
        if (!res.ok) throw new Error("HTTP " + res.status);
        const text = (await res.text()).trim();
        print(escapeHtml(text), "success");
      } catch (e) {
        print(`weather: could not fetch weather (${escapeHtml(String(e.message))})`, "error");
      }
    },

    async curl(args) {
      const url = args[0];
      if (!url) {
        print("curl: usage: curl <url>", "error");
        return;
      }
      let target = url;
      if (!/^https?:\/\//i.test(target)) target = "https://" + target;
      print(`Requesting ${escapeHtml(target)}...`, "muted");
      try {
        const res = await fetch(target);
        const text = await res.text();
        const snippet = text.length > 2000 ? text.slice(0, 2000) + "\n... (truncated)" : text;
        print(`<span class="muted">HTTP ${res.status} ${escapeHtml(res.statusText)}</span>`);
        print(escapeHtml(snippet));
      } catch (e) {
        print(
          `curl: request failed (${escapeHtml(String(e.message))}). The site may block cross-origin requests.`,
          "error"
        );
      }
    },

    echo(args) {
      print(escapeHtml(args.join(" ")));
    },

    date() {
      print(new Date().toString());
    },

    whoami() {
      print(USER);
    },

    clear() {
      output.innerHTML = "";
    },

    history() {
      if (history.length === 0) {
        print("No history yet.", "muted");
        return;
      }
      const rows = history
        .map((h, i) => `${String(i + 1).padStart(3, " ")}  ${escapeHtml(h)}`)
        .join("\n");
      print(rows);
    },

    about() {
      print(
        'WebShell v1.0.0 — a shell website built with <span class="accent">HTML</span>, <span class="accent">CSS</span>, and <span class="accent">JavaScript</span>.'
      );
    },

    theme(args) {
      const root = document.documentElement;
      const themes = {
        dark: { "--term-bg": "#11111b", "--bg": "#1e1e2e", "--text": "#cdd6f4" },
        light: { "--term-bg": "#fafafa", "--bg": "#e4e4e7", "--text": "#1e1e2e" },
        matrix: { "--term-bg": "#000000", "--bg": "#020402", "--text": "#33ff33" },
      };
      const t = themes[args[0]];
      if (!t) {
        print(
          `theme: unknown theme. Available: ${Object.keys(themes).join(", ")}`,
          "error"
        );
        return;
      }
      Object.entries(t).forEach(([k, v]) => root.style.setProperty(k, v));
      print(`Theme set to ${args[0]}.`, "success");
    },

    banner() {
      const art = [
        " _    _      _    _____ _          _ _ ",
        "| |  | |    | |  /  ___| |        | | |",
        "| |  | | ___| |__\\ `--.| |__   ___| | |",
        "| |/\\| |/ _ \\ '_ \\`--. \\ '_ \\ / _ \\ | |",
        "\\  /\\  /  __/ |_) /\\__/ / | | |  __/ | |",
        " \\/  \\/ \\___|_.__/\\____/|_| |_|\\___|_|_|",
      ].join("\n");
      print(`<span class="accent">${escapeHtml(art)}</span>`);
    },
  };

  const commandHelp = {
    help: "Show this help message",
    ls: "List directory contents",
    cd: "Change directory (cd <dir>, cd .., cd ~)",
    cat: "Print file contents (cat <file>)",
    pwd: "Print working directory",
    mkdir: "Create a directory (mkdir <name>)",
    touch: "Create an empty file (touch <name>)",
    rm: "Remove a file or directory (rm [-r] <name>)",
    calc: "Evaluate an arithmetic expression (calc 2 + 3 * 4)",
    weather: "Show weather for a city (weather <city>)",
    curl: "Fetch a URL (curl <url>)",
    echo: "Print text (echo <text>)",
    date: "Show current date and time",
    whoami: "Print current user",
    clear: "Clear the terminal",
    history: "Show command history",
    about: "About WebShell",
    theme: "Change theme (theme dark|light|matrix)",
    banner: "Show the ASCII banner",
  };

  function runCommand(raw) {
    const trimmed = raw.trim();
    if (trimmed === "") return;

    history.push(trimmed);
    historyIndex = history.length;

    const parts = trimmed.split(/\s+/);
    const name = parts[0];
    const args = parts.slice(1);

    if (commands[name]) {
      try {
        const maybePromise = commands[name](args);
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.catch((err) =>
            print(`${escapeHtml(name)}: ${escapeHtml(String(err))}`, "error")
          );
        }
      } catch (err) {
        print(`${escapeHtml(name)}: ${escapeHtml(String(err))}`, "error");
      }
    } else {
      print(
        `${escapeHtml(name)}: command not found. Type <span class="accent">help</span> for a list.`,
        "error"
      );
    }
  }

  // ---- Input handling ----
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      const value = input.value;
      echoCommand(value);
      runCommand(value);
      input.value = "";
      scrollToBottom();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      historyIndex = Math.max(0, historyIndex - 1);
      input.value = history[historyIndex] || "";
      moveCursorToEnd();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (history.length === 0) return;
      historyIndex = Math.min(history.length, historyIndex + 1);
      input.value = history[historyIndex] || "";
      moveCursorToEnd();
    } else if (e.key === "Tab") {
      e.preventDefault();
      autocomplete();
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      commands.clear();
    }
  });

  function moveCursorToEnd() {
    setTimeout(() => {
      input.selectionStart = input.selectionEnd = input.value.length;
    }, 0);
  }

  function autocomplete() {
    const value = input.value.trim();
    if (!value || value.includes(" ")) return;
    const matches = Object.keys(commands).filter((c) => c.startsWith(value));
    if (matches.length === 1) {
      input.value = matches[0] + " ";
    } else if (matches.length > 1) {
      print(matches.join("   "), "muted");
    }
  }

  // Keep focus on the input
  terminal.addEventListener("click", function () {
    input.focus();
  });

  updatePrompt();
  input.focus();
})();
