# 🛡️ CodeForge AI

> **All-in-One VS Code Extension** that analyzes your entire workspace, fixes vulnerabilities, errors, and polishes your code to production quality.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-green)
![License](https://img.shields.io/badge/license-MIT-purple)

## ✨ Features

### 🔍 **Complete Code Analysis**
- Scans **all files and folders** in your workspace
- Detects **security vulnerabilities** (SQL injection, XSS, hardcoded secrets)
- Finds **code errors** (syntax issues, runtime problems)
- Identifies **quality issues** (code smells, complexity, naming)

### 🔧 **One-Click Fixes**
- **Auto-fix** detected issues with a single click
- **Batch fix** all issues at once
- **AI-powered** fix generation for complex problems

### 💬 **Human-Friendly Explanations**
- Every issue explained in **plain English**
- Like having a **mentor** explain what's wrong
- **AI Chat** for interactive Q&A about your code

### 🎨 **Beautiful Dashboard**
- **Dark cyberpunk** themed interface
- Real-time **progress tracking**
- Issue **severity indicators**
- Quick **file navigation**

## 📦 Installation

1. Open VS Code
2. Go to Extensions (Cmd+Shift+X)
3. Search for "CodeForge AI"
4. Click Install

Or install from VSIX:
```bash
code --install-extension codeforge-ai-1.0.0.vsix
```

## 🚀 Quick Start

1. **Open a project** in VS Code
2. **Press `Cmd+Shift+A`** (or click the shield icon in sidebar)
3. **Click "Analyze"** to scan your workspace
4. **Review issues** in the dashboard
5. **Click "Fix"** to auto-fix issues

## ⌨️ Keyboard Shortcuts

| Command | Shortcut |
|---------|----------|
| Analyze Workspace | `Cmd+Shift+A` |
| Fix All Issues | `Cmd+Shift+F` |

## 🔑 AI Features

For advanced AI-powered analysis and fixes, set up your Gemini API key:

1. Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Open Command Palette (`Cmd+Shift+P`)
3. Run "CodeForge: Set Gemini API Key"
4. Paste your API key

### AI Features Include:
- 🤖 **Smart Fix Generation** - AI creates fixes for complex issues
- 💡 **Detailed Explanations** - Deep-dive explanations with examples
- 💬 **Interactive Chat** - Ask questions about your code

## 🔐 Security Checks

| Category | Detections |
|----------|------------|
| **Secrets** | API keys, passwords, tokens, private keys |
| **Injection** | SQL injection, XSS, command injection |
| **Auth** | Weak JWT, disabled SSL, session issues |
| **Crypto** | Weak hashes (MD5, SHA1), insecure random |
| **Data** | Sensitive data in logs, URLs, errors |

## 📊 Quality Checks

| Category | Detections |
|----------|------------|
| **Errors** | Syntax errors, type issues, undefined vars |
| **Smells** | Duplicate code, deep nesting, long functions |
| **Style** | Naming conventions, formatting, comments |
| **Best Practices** | Modern patterns, error handling, async |

## 🌍 Supported Languages

- JavaScript / TypeScript
- Python
- Java
- C / C++
- Go
- Ruby
- PHP
- HTML / CSS
- SQL
- And more...

## ⚙️ Configuration

```json
{
  "codeforge.autoAnalyzeOnSave": false,
  "codeforge.maxFilesToAnalyze": 100,
  "codeforge.excludePatterns": [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**"
  ]
}
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines.

## 📄 License

MIT License - see LICENSE file for details.

---

**Made with 💚 by CodeForge Team**

*Transform vibe-coded projects into production-ready code!*
