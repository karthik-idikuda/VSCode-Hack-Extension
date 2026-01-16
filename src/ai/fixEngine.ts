import * as vscode from 'vscode';
import * as fs from 'fs';
import { GeminiClient } from './geminiClient';

export interface Issue {
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    line: number;
    type: string;
    file: string;
    code?: string;
    fix?: string;
}

export class FixEngine {
    private geminiClient: GeminiClient;

    constructor(geminiClient: GeminiClient) {
        this.geminiClient = geminiClient;
    }

    async fixIssue(issue: Issue): Promise<boolean> {
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

        } catch (error) {
            console.error(`Error fixing issue:`, error);
            return false;
        }
    }

    private async applyFix(filePath: string, line: number, original: string, replacement: string): Promise<boolean> {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const edit = new vscode.WorkspaceEdit();
            
            // Find the line and replace content
            const lineIndex = line - 1;
            const lineText = document.lineAt(lineIndex).text;
            
            // If we have specific original code, replace just that
            if (original && lineText.includes(original.trim())) {
                const startCol = lineText.indexOf(original.trim());
                const range = new vscode.Range(
                    new vscode.Position(lineIndex, startCol),
                    new vscode.Position(lineIndex, startCol + original.trim().length)
                );
                edit.replace(document.uri, range, replacement.trim());
            } else {
                // Replace entire line
                const range = new vscode.Range(
                    new vscode.Position(lineIndex, 0),
                    new vscode.Position(lineIndex, lineText.length)
                );
                edit.replace(document.uri, range, replacement);
            }

            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
                await document.save();
                return true;
            }

            return false;

        } catch (error) {
            console.error(`Error applying fix:`, error);
            return false;
        }
    }

    async batchFix(issues: Issue[]): Promise<{ fixed: number; failed: number }> {
        let fixed = 0;
        let failed = 0;

        // Group issues by file for efficient processing
        const issuesByFile = new Map<string, Issue[]>();
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
                } else {
                    failed++;
                }
            }
        }

        return { fixed, failed };
    }

    async polishCode(filePath: string): Promise<boolean> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            
            // Request AI to polish the code
            const polishedCode = await this.geminiClient.analyze(content, 'auto', 'polish');
            
            // This would require more sophisticated parsing to apply
            // For now, return false to indicate manual review needed
            return false;

        } catch (error) {
            console.error(`Error polishing code:`, error);
            return false;
        }
    }

    generateQuickFix(issue: Issue): vscode.CodeAction | null {
        if (!issue.fix) return null;

        const action = new vscode.CodeAction(
            `Fix: ${issue.title}`,
            vscode.CodeActionKind.QuickFix
        );
        
        action.diagnostics = [];
        action.isPreferred = true;

        return action;
    }
}
