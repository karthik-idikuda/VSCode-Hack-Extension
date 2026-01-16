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
exports.FileScanner = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class FileScanner {
    excludePatterns = [];
    constructor() {
        this.loadConfig();
    }
    loadConfig() {
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
    async scanWorkspace(rootPath) {
        const files = [];
        const config = vscode.workspace.getConfiguration('codeforge');
        const maxFiles = config.get('maxFilesToAnalyze') ?? 100;
        await this.scanDirectory(rootPath, files, maxFiles);
        return files;
    }
    async scanDirectory(dirPath, files, maxFiles) {
        if (files.length >= maxFiles)
            return;
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                if (files.length >= maxFiles)
                    break;
                const fullPath = path.join(dirPath, entry.name);
                if (this.shouldExclude(fullPath))
                    continue;
                if (entry.isDirectory()) {
                    await this.scanDirectory(fullPath, files, maxFiles);
                }
                else if (entry.isFile() && this.isSupportedFile(entry.name)) {
                    files.push(fullPath);
                }
            }
        }
        catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error);
        }
    }
    shouldExclude(filePath) {
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
    isSupportedFile(fileName) {
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
    getLanguageFromFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap = {
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
exports.FileScanner = FileScanner;
//# sourceMappingURL=fileScanner.js.map