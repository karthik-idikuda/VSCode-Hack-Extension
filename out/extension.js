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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const SidebarProvider_1 = require("./webview/SidebarProvider");
const fileScanner_1 = require("./analyzer/fileScanner");
const codeAnalyzer_1 = require("./analyzer/codeAnalyzer");
const securityScanner_1 = require("./analyzer/securityScanner");
const qualityChecker_1 = require("./analyzer/qualityChecker");
const geminiClient_1 = require("./ai/geminiClient");
const fixEngine_1 = require("./ai/fixEngine");
let sidebarProvider;
let analyzerInstance;
function activate(context) {
    console.log('🔥 CodeForge AI is now active!');
    // Initialize components
    const fileScanner = new fileScanner_1.FileScanner();
    const codeAnalyzer = new codeAnalyzer_1.CodeAnalyzer();
    const securityScanner = new securityScanner_1.SecurityScanner();
    const qualityChecker = new qualityChecker_1.QualityChecker();
    const geminiClient = new geminiClient_1.GeminiClient(context);
    const fixEngine = new fixEngine_1.FixEngine(geminiClient);
    analyzerInstance = {
        fileScanner,
        codeAnalyzer,
        securityScanner,
        qualityChecker,
        geminiClient,
        fixEngine
    };
    // Initialize sidebar provider
    sidebarProvider = new SidebarProvider_1.SidebarProvider(context.extensionUri, analyzerInstance);
    // Register sidebar webview
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('codeforge.dashboard', sidebarProvider));
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('codeforge.analyzeWorkspace', async () => {
        await analyzeWorkspace();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codeforge.analyzeCurrentFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await analyzeFile(editor.document.uri);
        }
        else {
            vscode.window.showWarningMessage('No file is currently open');
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codeforge.fixAll', async () => {
        await fixAllIssues();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codeforge.openDashboard', () => {
        vscode.commands.executeCommand('workbench.view.extension.codeforge-sidebar');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codeforge.setApiKey', async () => {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Google Gemini API key',
            password: true,
            placeHolder: 'AIza...'
        });
        if (apiKey) {
            await context.secrets.store('codeforge.geminiApiKey', apiKey);
            geminiClient.setApiKey(apiKey);
            vscode.window.showInformationMessage('✅ API key saved successfully!');
        }
    }));
    // Auto-analyze on save if enabled
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (document) => {
        const config = vscode.workspace.getConfiguration('codeforge');
        if (config.get('autoAnalyzeOnSave')) {
            await analyzeFile(document.uri);
        }
    }));
    // Load saved API key
    context.secrets.get('codeforge.geminiApiKey').then((key) => {
        if (key) {
            geminiClient.setApiKey(key);
        }
    });
    // Show welcome message
    vscode.window.showInformationMessage('🛡️ CodeForge AI activated! Press Cmd+Shift+A to analyze your workspace.', 'Analyze Now').then((selection) => {
        if (selection === 'Analyze Now') {
            vscode.commands.executeCommand('codeforge.analyzeWorkspace');
        }
    });
}
async function analyzeWorkspace() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showWarningMessage('No workspace folder open');
        return;
    }
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '🔍 CodeForge AI Analyzing Workspace...',
        cancellable: true
    }, async (progress, token) => {
        try {
            const rootPath = workspaceFolders[0].uri.fsPath;
            // Step 1: Scan files
            progress.report({ message: 'Scanning files...', increment: 0 });
            const files = await analyzerInstance.fileScanner.scanWorkspace(rootPath);
            if (token.isCancellationRequested)
                return;
            const totalFiles = files.length;
            const allIssues = [];
            // Step 2: Analyze each file
            for (let i = 0; i < files.length; i++) {
                if (token.isCancellationRequested)
                    return;
                const file = files[i];
                const fileName = file.split('/').pop() || file;
                progress.report({
                    message: `Analyzing: ${fileName} (${i + 1}/${totalFiles})`,
                    increment: 100 / totalFiles
                });
                const issues = await analyzeFileInternal(file);
                allIssues.push(...issues);
            }
            // Step 3: Update sidebar with results
            sidebarProvider.updateResults(allIssues);
            vscode.window.showInformationMessage(`✅ Analysis complete! Found ${allIssues.length} issues in ${totalFiles} files.`, 'View Dashboard', 'Fix All').then((selection) => {
                if (selection === 'View Dashboard') {
                    vscode.commands.executeCommand('codeforge.openDashboard');
                }
                else if (selection === 'Fix All') {
                    vscode.commands.executeCommand('codeforge.fixAll');
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Analysis failed: ${error}`);
        }
    });
}
async function analyzeFile(uri) {
    const issues = await analyzeFileInternal(uri.fsPath);
    sidebarProvider.updateResults(issues);
    if (issues.length === 0) {
        vscode.window.showInformationMessage('✅ No issues found in this file!');
    }
    else {
        vscode.window.showInformationMessage(`Found ${issues.length} issues`, 'Fix Now').then((selection) => {
            if (selection === 'Fix Now') {
                fixFileIssues(uri, issues);
            }
        });
    }
}
async function analyzeFileInternal(filePath) {
    const allIssues = [];
    try {
        // Run all analyzers
        const codeIssues = await analyzerInstance.codeAnalyzer.analyze(filePath);
        const securityIssues = await analyzerInstance.securityScanner.scan(filePath);
        const qualityIssues = await analyzerInstance.qualityChecker.check(filePath);
        allIssues.push(...codeIssues.map(i => ({ ...i, type: 'error', file: filePath })));
        allIssues.push(...securityIssues.map(i => ({ ...i, type: 'security', file: filePath })));
        allIssues.push(...qualityIssues.map(i => ({ ...i, type: 'quality', file: filePath })));
    }
    catch (error) {
        console.error(`Error analyzing ${filePath}:`, error);
    }
    return allIssues;
}
async function fixAllIssues() {
    const issues = sidebarProvider.getCurrentIssues();
    if (issues.length === 0) {
        vscode.window.showInformationMessage('No issues to fix! Run analysis first.');
        return;
    }
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '🔧 CodeForge AI Fixing Issues...',
        cancellable: true
    }, async (progress, token) => {
        let fixedCount = 0;
        for (let i = 0; i < issues.length; i++) {
            if (token.isCancellationRequested)
                break;
            const issue = issues[i];
            progress.report({
                message: `Fixing: ${issue.title} (${i + 1}/${issues.length})`,
                increment: 100 / issues.length
            });
            try {
                const fixed = await analyzerInstance.fixEngine.fixIssue(issue);
                if (fixed)
                    fixedCount++;
            }
            catch (error) {
                console.error(`Failed to fix issue:`, error);
            }
        }
        vscode.window.showInformationMessage(`✅ Fixed ${fixedCount} of ${issues.length} issues!`);
        // Re-analyze to update the dashboard
        vscode.commands.executeCommand('codeforge.analyzeWorkspace');
    });
}
async function fixFileIssues(uri, issues) {
    for (const issue of issues) {
        await analyzerInstance.fixEngine.fixIssue(issue);
    }
    vscode.window.showInformationMessage('✅ File issues fixed!');
}
function deactivate() {
    console.log('CodeForge AI deactivated');
}
//# sourceMappingURL=extension.js.map