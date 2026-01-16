"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarProvider = void 0;
const vscode = __importStar(require("vscode"));
class SidebarProvider {
    _extensionUri;
    _view;
    _issues = [];
    _analyzers;
    constructor(_extensionUri, analyzers) {
        this._extensionUri = _extensionUri;
        this._analyzers = analyzers;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlContent(webviewView.webview);
        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'analyze':
                    vscode.commands.executeCommand('codeforge.analyzeWorkspace');
                    break;
                case 'fixAll':
                    vscode.commands.executeCommand('codeforge.fixAll');
                    break;
                case 'fixIssue':
                    await this.fixSingleIssue(data.index);
                    break;
                case 'openFile':
                    await this.openFileAtLine(data.file, data.line);
                    break;
                case 'chat':
                    await this.handleChat(data.message);
                    break;
                case 'setApiKey':
                    vscode.commands.executeCommand('codeforge.setApiKey');
                    break;
                case 'explainIssue':
                    await this.explainIssue(data.index);
                    break;
            }
        });
    }
    updateResults(issues) {
        this._issues = issues;
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateIssues',
                issues: this.formatIssues(issues)
            });
        }
    }
    getCurrentIssues() {
        return this._issues;
    }
    formatIssues(issues) {
        return issues.map((issue, index) => ({
            ...issue,
            index,
            fileName: issue.file?.split('/').pop() || 'Unknown',
            severityColor: this.getSeverityColor(issue.severity),
            severityIcon: this.getSeverityIcon(issue.severity),
            typeIcon: this.getTypeIcon(issue.type)
        }));
    }
    getSeverityColor(severity) {
        const colors = {
            critical: '#ff4757',
            high: '#ff6b6b',
            medium: '#ffa502',
            low: '#2ed573'
        };
        return colors[severity] || '#a4b0be';
    }
    getSeverityIcon(severity) {
        const icons = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
        };
        return icons[severity] || '⚪';
    }
    getTypeIcon(type) {
        const icons = {
            security: '🔐',
            error: '🐛',
            quality: '✨'
        };
        return icons[type] || '📋';
    }
    async fixSingleIssue(index) {
        const issue = this._issues[index];
        if (!issue)
            return;
        const success = await this._analyzers.fixEngine.fixIssue(issue);
        if (success) {
            this._issues.splice(index, 1);
            this.updateResults(this._issues);
            vscode.window.showInformationMessage(`✅ Fixed: ${issue.title}`);
        }
        else {
            vscode.window.showWarningMessage(`Could not auto-fix this issue. Manual fix required.`);
        }
    }
    async openFileAtLine(filePath, line) {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const editor = await vscode.window.showTextDocument(document);
            const position = new vscode.Position(line - 1, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
        }
    }
    async handleChat(message) {
        const context = this._issues.length > 0
            ? `Found ${this._issues.length} issues in the project.`
            : 'No issues found yet. Run analysis first.';
        const response = await this._analyzers.geminiClient.chat(message, context);
        if (this._view) {
            this._view.webview.postMessage({
                command: 'chatResponse',
                message: response
            });
        }
    }
    async explainIssue(index) {
        const issue = this._issues[index];
        if (!issue)
            return;
        const explanation = await this._analyzers.geminiClient.explainIssue(issue);
        if (this._view) {
            this._view.webview.postMessage({
                command: 'showExplanation',
                index,
                explanation
            });
        }
    }
    _getHtmlContent(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeForge AI</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
            color: #e0e0e0;
            min-height: 100vh;
            padding: 16px;
        }

        /* Header */
        .header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(0, 255, 136, 0.2);
        }

        .logo {
            font-size: 24px;
        }

        .title {
            font-size: 18px;
            font-weight: 700;
            background: linear-gradient(90deg, #00ff88, #00d4ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .subtitle {
            font-size: 11px;
            color: #888;
        }

        /* Stats Grid */
        .stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 16px;
        }

        .stat {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 10px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stat-value {
            font-size: 20px;
            font-weight: 700;
        }

        .stat-label {
            font-size: 9px;
            color: #888;
            text-transform: uppercase;
        }

        .critical { color: #ff4757; }
        .high { color: #ff6b6b; }
        .medium { color: #ffa502; }
        .low { color: #2ed573; }

        /* Action Buttons */
        .actions {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
        }

        .btn {
            flex: 1;
            padding: 12px 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .btn-primary {
            background: linear-gradient(135deg, #00ff88 0%, #00d4ff 100%);
            color: #000;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0, 255, 136, 0.4);
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        /* Tabs */
        .tabs {
            display: flex;
            gap: 4px;
            margin-bottom: 12px;
            background: rgba(255, 255, 255, 0.05);
            padding: 4px;
            border-radius: 8px;
        }

        .tab {
            flex: 1;
            padding: 8px;
            border: none;
            background: transparent;
            color: #888;
            cursor: pointer;
            border-radius: 6px;
            font-size: 11px;
            transition: all 0.2s;
        }

        .tab.active {
            background: rgba(0, 255, 136, 0.2);
            color: #00ff88;
        }

        /* Issues List */
        .issues-container {
            max-height: 300px;
            overflow-y: auto;
        }

        .issue {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 8px;
            border-left: 3px solid;
            cursor: pointer;
            transition: all 0.2s;
        }

        .issue:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateX(4px);
        }

        .issue-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
        }

        .issue-icon {
            font-size: 14px;
        }

        .issue-title {
            flex: 1;
            font-size: 12px;
            font-weight: 600;
        }

        .issue-severity {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.1);
        }

        .issue-meta {
            font-size: 10px;
            color: #888;
            display: flex;
            gap: 12px;
        }

        .issue-actions {
            display: flex;
            gap: 6px;
            margin-top: 8px;
        }

        .issue-btn {
            padding: 4px 8px;
            font-size: 10px;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
        }

        .issue-btn-fix {
            background: #00ff88;
            color: #000;
        }

        .issue-btn-explain {
            background: rgba(0, 212, 255, 0.2);
            color: #00d4ff;
        }

        /* Chat Section */
        .chat-section {
            display: none;
            flex-direction: column;
            height: 350px;
        }

        .chat-section.visible {
            display: flex;
        }

        .chat-messages {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 12px;
            padding: 8px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
        }

        .chat-message {
            margin-bottom: 12px;
            padding: 10px;
            border-radius: 8px;
            font-size: 12px;
            line-height: 1.5;
        }

        .chat-message.user {
            background: rgba(0, 255, 136, 0.1);
            margin-left: 20px;
        }

        .chat-message.ai {
            background: rgba(0, 212, 255, 0.1);
            margin-right: 20px;
        }

        .chat-input-container {
            display: flex;
            gap: 8px;
        }

        .chat-input {
            flex: 1;
            padding: 10px 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
            font-size: 12px;
        }

        .chat-input:focus {
            outline: none;
            border-color: #00ff88;
        }

        .chat-send {
            padding: 10px 16px;
            background: #00ff88;
            color: #000;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
        }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #888;
        }

        .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }

        /* Settings */
        .settings-section {
            display: none;
            padding: 16px;
        }

        .settings-section.visible {
            display: block;
        }

        .setting-item {
            margin-bottom: 16px;
        }

        .setting-label {
            font-size: 12px;
            margin-bottom: 6px;
            color: #888;
        }

        /* Explanation Modal */
        .explanation {
            display: none;
            background: rgba(0, 0, 0, 0.95);
            padding: 16px;
            border-radius: 8px;
            margin-top: 8px;
            border: 1px solid rgba(0, 255, 136, 0.3);
        }

        .explanation.visible {
            display: block;
        }

        .explanation-text {
            font-size: 12px;
            line-height: 1.6;
            color: #e0e0e0;
        }

        /* Progress */
        .progress {
            display: none;
            margin-bottom: 16px;
        }

        .progress.visible {
            display: block;
        }

        .progress-bar {
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #00ff88, #00d4ff);
            width: 0%;
            transition: width 0.3s ease;
        }

        .progress-text {
            font-size: 11px;
            color: #888;
            margin-top: 6px;
            text-align: center;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
            width: 6px;
        }

        ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
        }

        ::-webkit-scrollbar-thumb {
            background: rgba(0, 255, 136, 0.3);
            border-radius: 3px;
        }

        /* Animation */
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .analyzing .progress-fill {
            animation: pulse 1s infinite;
        }
    </style>
</head>
<body>
    <div class="header">
        <span class="logo">🛡️</span>
        <div>
            <div class="title">CodeForge AI</div>
            <div class="subtitle">All-in-One Code Analyzer</div>
        </div>
    </div>

    <div class="stats" id="stats">
        <div class="stat">
            <div class="stat-value critical" id="criticalCount">0</div>
            <div class="stat-label">Critical</div>
        </div>
        <div class="stat">
            <div class="stat-value high" id="highCount">0</div>
            <div class="stat-label">High</div>
        </div>
        <div class="stat">
            <div class="stat-value medium" id="mediumCount">0</div>
            <div class="stat-label">Medium</div>
        </div>
        <div class="stat">
            <div class="stat-value low" id="lowCount">0</div>
            <div class="stat-label">Low</div>
        </div>
    </div>

    <div class="progress" id="progress">
        <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
        </div>
        <div class="progress-text" id="progressText">Analyzing...</div>
    </div>

    <div class="actions">
        <button class="btn btn-primary" id="analyzeBtn">
            🔍 Analyze
        </button>
        <button class="btn btn-secondary" id="fixAllBtn">
            🔧 Fix All
        </button>
    </div>

    <div class="tabs">
        <button class="tab active" data-tab="issues">Issues</button>
        <button class="tab" data-tab="chat">AI Chat</button>
        <button class="tab" data-tab="settings">Settings</button>
    </div>

    <div class="issues-container" id="issuesTab">
        <div class="empty-state" id="emptyState">
            <div class="empty-icon">🔍</div>
            <div>No issues found yet</div>
            <div style="margin-top: 8px; font-size: 11px;">Click "Analyze" to scan your workspace</div>
        </div>
        <div id="issuesList"></div>
    </div>

    <div class="chat-section" id="chatTab">
        <div class="chat-messages" id="chatMessages">
            <div class="chat-message ai">
                👋 Hi! I'm CodeForge AI. I can help you fix code issues, explain vulnerabilities, and improve your code quality. What would you like to know?
            </div>
        </div>
        <div class="chat-input-container">
            <input type="text" class="chat-input" id="chatInput" placeholder="Ask me anything...">
            <button class="chat-send" id="chatSend">Send</button>
        </div>
    </div>

    <div class="settings-section" id="settingsTab">
        <div class="setting-item">
            <div class="setting-label">Gemini API Key</div>
            <button class="btn btn-secondary" id="setApiKeyBtn" style="width: 100%;">
                🔑 Set API Key
            </button>
        </div>
        <div class="setting-item">
            <div class="setting-label" style="margin-top: 20px;">About</div>
            <p style="font-size: 11px; color: #888; line-height: 1.5;">
                CodeForge AI analyzes your code for security vulnerabilities, errors, and quality issues. 
                Connect your Gemini API key for AI-powered fixes and explanations.
            </p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        let currentTab = 'issues';
        let issues = [];

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                currentTab = tab.dataset.tab;
                
                document.getElementById('issuesTab').style.display = currentTab === 'issues' ? 'block' : 'none';
                document.getElementById('chatTab').classList.toggle('visible', currentTab === 'chat');
                document.getElementById('settingsTab').classList.toggle('visible', currentTab === 'settings');
            });
        });

        // Analyze button
        document.getElementById('analyzeBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'analyze' });
            showProgress();
        });

        // Fix All button
        document.getElementById('fixAllBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'fixAll' });
        });

        // Set API Key button
        document.getElementById('setApiKeyBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'setApiKey' });
        });

        // Chat
        document.getElementById('chatSend').addEventListener('click', sendChat);
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChat();
        });

        function sendChat() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            if (!message) return;

            addChatMessage(message, 'user');
            input.value = '';

            vscode.postMessage({ command: 'chat', message });
        }

        function addChatMessage(text, type) {
            const messagesDiv = document.getElementById('chatMessages');
            const msgDiv = document.createElement('div');
            msgDiv.className = 'chat-message ' + type;
            msgDiv.textContent = text;
            messagesDiv.appendChild(msgDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function showProgress() {
            document.getElementById('progress').classList.add('visible');
        }

        function hideProgress() {
            document.getElementById('progress').classList.remove('visible');
        }

        function updateIssuesList(newIssues) {
            issues = newIssues;
            hideProgress();

            const counts = { critical: 0, high: 0, medium: 0, low: 0 };
            issues.forEach(issue => {
                if (counts[issue.severity] !== undefined) {
                    counts[issue.severity]++;
                }
            });

            document.getElementById('criticalCount').textContent = counts.critical;
            document.getElementById('highCount').textContent = counts.high;
            document.getElementById('mediumCount').textContent = counts.medium;
            document.getElementById('lowCount').textContent = counts.low;

            const emptyState = document.getElementById('emptyState');
            const issuesList = document.getElementById('issuesList');

            if (issues.length === 0) {
                emptyState.style.display = 'block';
                issuesList.innerHTML = '';
            } else {
                emptyState.style.display = 'none';
                issuesList.innerHTML = issues.map((issue, index) => \`
                    <div class="issue" style="border-left-color: \${issue.severityColor}" data-index="\${index}">
                        <div class="issue-header">
                            <span class="issue-icon">\${issue.typeIcon}</span>
                            <span class="issue-title">\${issue.title}</span>
                            <span class="issue-severity">\${issue.severityIcon}</span>
                        </div>
                        <div class="issue-meta">
                            <span>📄 \${issue.fileName}</span>
                            <span>📍 Line \${issue.line}</span>
                        </div>
                        <div class="issue-actions">
                            <button class="issue-btn issue-btn-fix" onclick="fixIssue(\${index})">⚡ Fix</button>
                            <button class="issue-btn issue-btn-explain" onclick="explainIssue(\${index})">💡 Explain</button>
                            <button class="issue-btn" onclick="openFile(\${index})" style="background: rgba(255,255,255,0.1); color: #fff;">📂 Open</button>
                        </div>
                        <div class="explanation" id="explanation-\${index}">
                            <div class="explanation-text"></div>
                        </div>
                    </div>
                \`).join('');
            }
        }

        function fixIssue(index) {
            vscode.postMessage({ command: 'fixIssue', index });
        }

        function explainIssue(index) {
            vscode.postMessage({ command: 'explainIssue', index });
        }

        function openFile(index) {
            const issue = issues[index];
            vscode.postMessage({ command: 'openFile', file: issue.file, line: issue.line });
        }

        // Handle messages from extension
        window.addEventListener('message', (event) => {
            const data = event.data;
            switch (data.command) {
                case 'updateIssues':
                    updateIssuesList(data.issues);
                    break;
                case 'chatResponse':
                    addChatMessage(data.message, 'ai');
                    break;
                case 'showExplanation':
                    const expDiv = document.getElementById('explanation-' + data.index);
                    if (expDiv) {
                        expDiv.classList.add('visible');
                        expDiv.querySelector('.explanation-text').textContent = data.explanation;
                    }
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}
exports.SidebarProvider = SidebarProvider;
//# sourceMappingURL=SidebarProvider.js.map