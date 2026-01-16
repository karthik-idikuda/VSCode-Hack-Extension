import * as vscode from 'vscode';
import { SidebarProvider } from './webview/SidebarProvider';
import { FileScanner } from './analyzer/fileScanner';
import { CodeAnalyzer } from './analyzer/codeAnalyzer';
import { SecurityScanner } from './analyzer/securityScanner';
import { QualityChecker } from './analyzer/qualityChecker';
import { GeminiClient } from './ai/geminiClient';
import { FixEngine } from './ai/fixEngine';

let sidebarProvider: SidebarProvider;
let analyzerInstance: {
    fileScanner: FileScanner;
    codeAnalyzer: CodeAnalyzer;
    securityScanner: SecurityScanner;
    qualityChecker: QualityChecker;
    geminiClient: GeminiClient;
    fixEngine: FixEngine;
};

export function activate(context: vscode.ExtensionContext) {
    console.log('🔥 CodeForge AI is now active!');

    // Initialize components
    const fileScanner = new FileScanner();
    const codeAnalyzer = new CodeAnalyzer();
    const securityScanner = new SecurityScanner();
    const qualityChecker = new QualityChecker();
    const geminiClient = new GeminiClient(context);
    const fixEngine = new FixEngine(geminiClient);

    analyzerInstance = {
        fileScanner,
        codeAnalyzer,
        securityScanner,
        qualityChecker,
        geminiClient,
        fixEngine
    };

    // Initialize sidebar provider
    sidebarProvider = new SidebarProvider(context.extensionUri, analyzerInstance);

    // Register sidebar webview
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'codeforge.dashboard',
            sidebarProvider
        )
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('codeforge.analyzeWorkspace', async () => {
            await analyzeWorkspace();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codeforge.analyzeCurrentFile', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                await analyzeFile(editor.document.uri);
            } else {
                vscode.window.showWarningMessage('No file is currently open');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codeforge.fixAll', async () => {
            await fixAllIssues();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codeforge.openDashboard', () => {
            vscode.commands.executeCommand('workbench.view.extension.codeforge-sidebar');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codeforge.setApiKey', async () => {
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
        })
    );

    // Auto-analyze on save if enabled
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            const config = vscode.workspace.getConfiguration('codeforge');
            if (config.get('autoAnalyzeOnSave')) {
                await analyzeFile(document.uri);
            }
        })
    );

    // Load saved API key
    context.secrets.get('codeforge.geminiApiKey').then((key) => {
        if (key) {
            geminiClient.setApiKey(key);
        }
    });

    // Show welcome message
    vscode.window.showInformationMessage(
        '🛡️ CodeForge AI activated! Press Cmd+Shift+A to analyze your workspace.',
        'Analyze Now'
    ).then((selection) => {
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
            
            if (token.isCancellationRequested) return;

            const totalFiles = files.length;
            const allIssues: any[] = [];

            // Step 2: Analyze each file
            for (let i = 0; i < files.length; i++) {
                if (token.isCancellationRequested) return;

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

            vscode.window.showInformationMessage(
                `✅ Analysis complete! Found ${allIssues.length} issues in ${totalFiles} files.`,
                'View Dashboard',
                'Fix All'
            ).then((selection) => {
                if (selection === 'View Dashboard') {
                    vscode.commands.executeCommand('codeforge.openDashboard');
                } else if (selection === 'Fix All') {
                    vscode.commands.executeCommand('codeforge.fixAll');
                }
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Analysis failed: ${error}`);
        }
    });
}

async function analyzeFile(uri: vscode.Uri) {
    const issues = await analyzeFileInternal(uri.fsPath);
    sidebarProvider.updateResults(issues);
    
    if (issues.length === 0) {
        vscode.window.showInformationMessage('✅ No issues found in this file!');
    } else {
        vscode.window.showInformationMessage(
            `Found ${issues.length} issues`,
            'Fix Now'
        ).then((selection) => {
            if (selection === 'Fix Now') {
                fixFileIssues(uri, issues);
            }
        });
    }
}

async function analyzeFileInternal(filePath: string): Promise<any[]> {
    const allIssues: any[] = [];

    try {
        // Run all analyzers
        const codeIssues = await analyzerInstance.codeAnalyzer.analyze(filePath);
        const securityIssues = await analyzerInstance.securityScanner.scan(filePath);
        const qualityIssues = await analyzerInstance.qualityChecker.check(filePath);

        allIssues.push(...codeIssues.map(i => ({ ...i, type: 'error', file: filePath })));
        allIssues.push(...securityIssues.map(i => ({ ...i, type: 'security', file: filePath })));
        allIssues.push(...qualityIssues.map(i => ({ ...i, type: 'quality', file: filePath })));

    } catch (error) {
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
            if (token.isCancellationRequested) break;

            const issue = issues[i];
            progress.report({
                message: `Fixing: ${issue.title} (${i + 1}/${issues.length})`,
                increment: 100 / issues.length
            });

            try {
                const fixed = await analyzerInstance.fixEngine.fixIssue(issue);
                if (fixed) fixedCount++;
            } catch (error) {
                console.error(`Failed to fix issue:`, error);
            }
        }

        vscode.window.showInformationMessage(
            `✅ Fixed ${fixedCount} of ${issues.length} issues!`
        );

        // Re-analyze to update the dashboard
        vscode.commands.executeCommand('codeforge.analyzeWorkspace');
    });
}

async function fixFileIssues(uri: vscode.Uri, issues: any[]) {
    for (const issue of issues) {
        await analyzerInstance.fixEngine.fixIssue(issue);
    }
    vscode.window.showInformationMessage('✅ File issues fixed!');
}

export function deactivate() {
    console.log('CodeForge AI deactivated');
}
