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
exports.FixEngine = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
class FixEngine {
    geminiClient;
    constructor(geminiClient) {
        this.geminiClient = geminiClient;
    }
    async fixIssue(issue) {
        try {
            // If we have a pre-defined fix, use it
            if (issue.fix) {
                return await this.applyFix(issue.file, issue.line, issue.code || '', issue.fix);
            }
            // Otherwise, try to generate a fix with AI
            const fileContent = fs.readFileSync(issue.file, 'utf-8');
            const lines = fileContent.split('\n');
            const contextStart = Math.max(0, issue.line - 5);
            const contextEnd = Math.min(lines.length, issue.line + 5);
            const contextCode = lines.slice(contextStart, contextEnd).join('\n');
            const fix = await this.geminiClient.generateFix(contextCode, issue);
            if (fix) {
                // Apply the AI-generated fix
                const document = await vscode.workspace.openTextDocument(issue.file);
                const edit = new vscode.WorkspaceEdit();
                // Replace the context with the fixed code
                const startPos = new vscode.Position(contextStart, 0);
                const endPos = new vscode.Position(contextEnd, lines[contextEnd - 1]?.length || 0);
                edit.replace(document.uri, new vscode.Range(startPos, endPos), fix);
                const success = await vscode.workspace.applyEdit(edit);
                if (success) {
                    await document.save();
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            console.error(`Error fixing issue:`, error);
            return false;
        }
    }
    async applyFix(filePath, line, original, replacement) {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const edit = new vscode.WorkspaceEdit();
            // Find the line and replace content
            const lineIndex = line - 1;
            const lineText = document.lineAt(lineIndex).text;
            // If we have specific original code, replace just that
            if (original && lineText.includes(original.trim())) {
                const startCol = lineText.indexOf(original.trim());
                const range = new vscode.Range(new vscode.Position(lineIndex, startCol), new vscode.Position(lineIndex, startCol + original.trim().length));
                edit.replace(document.uri, range, replacement.trim());
            }
            else {
                // Replace entire line
                const range = new vscode.Range(new vscode.Position(lineIndex, 0), new vscode.Position(lineIndex, lineText.length));
                edit.replace(document.uri, range, replacement);
            }
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
                await document.save();
                return true;
            }
            return false;
        }
        catch (error) {
            console.error(`Error applying fix:`, error);
            return false;
        }
    }
    async batchFix(issues) {
        let fixed = 0;
        let failed = 0;
        // Group issues by file for efficient processing
        const issuesByFile = new Map();
        for (const issue of issues) {
            const existing = issuesByFile.get(issue.file) || [];
            existing.push(issue);
            issuesByFile.set(issue.file, existing);
        }
        // Process each file
        for (const [file, fileIssues] of issuesByFile) {
            // Sort issues by line number (descending) to avoid offset issues
            const sortedIssues = fileIssues.sort((a, b) => b.line - a.line);
            for (const issue of sortedIssues) {
                const success = await this.fixIssue(issue);
                if (success) {
                    fixed++;
                }
                else {
                    failed++;
                }
            }
        }
        return { fixed, failed };
    }
    async polishCode(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            // Request AI to polish the code
            const polishedCode = await this.geminiClient.analyze(content, 'auto', 'polish');
            // This would require more sophisticated parsing to apply
            // For now, return false to indicate manual review needed
            return false;
        }
        catch (error) {
            console.error(`Error polishing code:`, error);
            return false;
        }
    }
    generateQuickFix(issue) {
        if (!issue.fix)
            return null;
        const action = new vscode.CodeAction(`Fix: ${issue.title}`, vscode.CodeActionKind.QuickFix);
        action.diagnostics = [];
        action.isPreferred = true;
        return action;
    }
}
exports.FixEngine = FixEngine;
//# sourceMappingURL=fixEngine.js.map