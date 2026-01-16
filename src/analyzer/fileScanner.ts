import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class FileScanner {
    private excludePatterns: string[] = [];

    constructor() {
        this.loadConfig();
    }

    private loadConfig() {
        const config = vscode.workspace.getConfiguration('codeforge');
        this.excludePatterns = config.get('excludePatterns') || [
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**',
            '**/build/**',
            '**/*.min.js',
            '**/*.min.css',
            '**/package-lock.json',
            '**/yarn.lock'
        ];
    }

    async scanWorkspace(rootPath: string): Promise<string[]> {
        const files: string[] = [];
        const config = vscode.workspace.getConfiguration('codeforge');
        const maxFiles = config.get<number>('maxFilesToAnalyze') ?? 100;

        await this.scanDirectory(rootPath, files, maxFiles);
        return files;
    }

    private async scanDirectory(dirPath: string, files: string[], maxFiles: number): Promise<void> {
        if (files.length >= maxFiles) return;

        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                if (files.length >= maxFiles) break;

                const fullPath = path.join(dirPath, entry.name);
                
                if (this.shouldExclude(fullPath)) continue;

                if (entry.isDirectory()) {
                    await this.scanDirectory(fullPath, files, maxFiles);
                } else if (entry.isFile() && this.isSupportedFile(entry.name)) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error);
        }
    }

    private shouldExclude(filePath: string): boolean {
        const relativePath = filePath.replace(/\\/g, '/');
        
        for (const pattern of this.excludePatterns) {
            // Simple glob matching
            const regexPattern = pattern
                .replace(/\*\*/g, '.*')
                .replace(/\*/g, '[^/]*')
                .replace(/\?/g, '.');
            
            if (new RegExp(regexPattern).test(relativePath)) {
                return true;
            }
        }
        return false;
    }

    private isSupportedFile(fileName: string): boolean {
        const supportedExtensions = [
            '.js', '.jsx', '.ts', '.tsx',
            '.py', '.pyw',
            '.java',
            '.c', '.cpp', '.cc', '.h', '.hpp',
            '.cs',
            '.go',
            '.rb',
            '.php',
            '.swift',
            '.kt', '.kts',
            '.rs',
            '.vue', '.svelte',
            '.html', '.htm',
            '.css', '.scss', '.sass', '.less',
            '.json',
            '.yaml', '.yml',
            '.xml',
            '.sql',
            '.sh', '.bash', '.zsh',
            '.md', '.markdown'
        ];

        const ext = path.extname(fileName).toLowerCase();
        return supportedExtensions.includes(ext);
    }

    getLanguageFromFile(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap: { [key: string]: string } = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.c': 'c',
            '.cpp': 'cpp',
            '.cs': 'csharp',
            '.go': 'go',
            '.rb': 'ruby',
            '.php': 'php',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.rs': 'rust',
            '.html': 'html',
            '.css': 'css',
            '.json': 'json',
            '.sql': 'sql'
        };

        return languageMap[ext] || 'plaintext';
    }
}
