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
exports.CodeAnalyzer = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class CodeAnalyzer {
    async analyze(filePath) {
        const issues = [];
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const ext = path.extname(filePath).toLowerCase();
            // Run analysis based on file type
            if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
                issues.push(...this.analyzeJavaScript(lines, content));
            }
            else if (['.py'].includes(ext)) {
                issues.push(...this.analyzePython(lines, content));
            }
            else if (['.html', '.htm'].includes(ext)) {
                issues.push(...this.analyzeHTML(lines, content));
            }
            else if (['.css', '.scss'].includes(ext)) {
                issues.push(...this.analyzeCSS(lines, content));
            }
            // Generic analysis for all files
            issues.push(...this.analyzeGeneric(lines, content));
        }
        catch (error) {
            console.error(`Error analyzing ${filePath}:`, error);
        }
        return issues;
    }
    analyzeJavaScript(lines, content) {
        const issues = [];
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            // Check for var usage (should use let/const)
            if (/\bvar\s+\w+/.test(line)) {
                issues.push({
                    title: 'Use const/let instead of var',
                    description: 'The "var" keyword has function scope and can lead to bugs. Use "const" for constants and "let" for variables that change.',
                    severity: 'medium',
                    line: lineNum,
                    code: line.trim(),
                    fix: line.replace(/\bvar\b/, 'const')
                });
            }
            // Check for console.log in production code
            if (/console\.(log|debug|info)\(/.test(line) && !line.includes('// keep')) {
                issues.push({
                    title: 'Remove console.log statement',
                    description: 'Console statements should be removed from production code. They can leak sensitive information and slow down your app.',
                    severity: 'low',
                    line: lineNum,
                    code: line.trim(),
                    fix: '// ' + line.trim()
                });
            }
            // Check for == instead of ===
            if (/[^=!]==[^=]/.test(line)) {
                issues.push({
                    title: 'Use strict equality (===)',
                    description: 'Loose equality (==) can cause unexpected type coercion. Use strict equality (===) for predictable comparisons.',
                    severity: 'medium',
                    line: lineNum,
                    code: line.trim(),
                    fix: line.replace(/([^=!])={2}([^=])/g, '$1===$2')
                });
            }
            // Check for alert() calls
            if (/\balert\s*\(/.test(line)) {
                issues.push({
                    title: 'Remove alert() call',
                    description: 'alert() blocks the UI and provides poor user experience. Use a proper modal or notification system instead.',
                    severity: 'medium',
                    line: lineNum,
                    code: line.trim()
                });
            }
            // Check for async without try-catch
            if (/async\s+function/.test(line) || /async\s*\(/.test(line)) {
                // Look ahead for try-catch
                const nextLines = lines.slice(index, index + 10).join('\n');
                if (!nextLines.includes('try') && !nextLines.includes('catch')) {
                    issues.push({
                        title: 'Missing error handling in async function',
                        description: 'Async functions should have try-catch blocks to handle errors. Unhandled promise rejections can crash your app.',
                        severity: 'high',
                        line: lineNum,
                        code: line.trim()
                    });
                }
            }
            // Check for empty catch blocks
            if (/catch\s*\([^)]*\)\s*{\s*}/.test(line)) {
                issues.push({
                    title: 'Empty catch block',
                    description: 'Catching errors without handling them hides bugs. At minimum, log the error or rethrow it.',
                    severity: 'high',
                    line: lineNum,
                    code: line.trim()
                });
            }
            // Check for TODO/FIXME comments
            if (/\/\/\s*(TODO|FIXME|HACK|XXX)/i.test(line)) {
                issues.push({
                    title: 'Unresolved TODO/FIXME comment',
                    description: 'This code has a pending task that should be addressed before shipping to production.',
                    severity: 'low',
                    line: lineNum,
                    code: line.trim()
                });
            }
            // Check for magic numbers
            const magicNumberMatch = line.match(/[^.\d](\d{3,})[^.\d]/);
            if (magicNumberMatch && !line.includes('const') && !line.includes('//')) {
                issues.push({
                    title: 'Magic number detected',
                    description: `The number ${magicNumberMatch[1]} should be extracted to a named constant for better readability and maintainability.`,
                    severity: 'low',
                    line: lineNum,
                    code: line.trim()
                });
            }
        });
        return issues;
    }
    analyzePython(lines, content) {
        const issues = [];
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            // Check for print statements (should use logging)
            if (/\bprint\s*\(/.test(line) && !line.includes('# keep')) {
                issues.push({
                    title: 'Use logging instead of print',
                    description: 'print() statements should be replaced with proper logging for production code. Use the logging module for better control.',
                    severity: 'low',
                    line: lineNum,
                    code: line.trim()
                });
            }
            // Check for bare except
            if (/except\s*:/.test(line)) {
                issues.push({
                    title: 'Bare except clause',
                    description: 'Catching all exceptions hides bugs. Specify the exception type you want to catch.',
                    severity: 'high',
                    line: lineNum,
                    code: line.trim(),
                    fix: line.replace('except:', 'except Exception as e:')
                });
            }
            // Check for mutable default arguments
            if (/def\s+\w+\s*\([^)]*=\s*(\[\]|\{\})/.test(line)) {
                issues.push({
                    title: 'Mutable default argument',
                    description: 'Using mutable objects (list, dict) as default arguments is dangerous. They persist across function calls. Use None instead.',
                    severity: 'high',
                    line: lineNum,
                    code: line.trim()
                });
            }
            // Check for import *
            if (/from\s+\w+\s+import\s+\*/.test(line)) {
                issues.push({
                    title: 'Wildcard import',
                    description: 'Wildcard imports make it unclear where names come from and can cause conflicts. Import specific names instead.',
                    severity: 'medium',
                    line: lineNum,
                    code: line.trim()
                });
            }
            // Check for eval usage
            if (/\beval\s*\(/.test(line)) {
                issues.push({
                    title: 'Dangerous eval() usage',
                    description: 'eval() executes arbitrary code and is a security risk. Find an alternative approach.',
                    severity: 'critical',
                    line: lineNum,
                    code: line.trim()
                });
            }
        });
        return issues;
    }
    analyzeHTML(lines, content) {
        const issues = [];
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            // Check for inline styles
            if (/style\s*=\s*["']/.test(line)) {
                issues.push({
                    title: 'Inline style detected',
                    description: 'Inline styles are harder to maintain. Move styles to a CSS file for better organization.',
                    severity: 'low',
                    line: lineNum,
                    code: line.trim()
                });
            }
            // Check for inline JavaScript
            if (/on\w+\s*=\s*["']/.test(line)) {
                issues.push({
                    title: 'Inline event handler',
                    description: 'Inline JavaScript is a security risk (XSS). Use addEventListener in separate JS files instead.',
                    severity: 'high',
                    line: lineNum,
                    code: line.trim()
                });
            }
            // Check for missing alt attribute
            if (/<img[^>]+(?!alt\s*=)[^>]*>/i.test(line)) {
                issues.push({
                    title: 'Missing alt attribute on image',
                    description: 'Images should have alt attributes for accessibility. Screen readers use this to describe images.',
                    severity: 'medium',
                    line: lineNum,
                    code: line.trim()
                });
            }
        });
        return issues;
    }
    analyzeCSS(lines, content) {
        const issues = [];
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            // Check for !important
            if (/!important/.test(line)) {
                issues.push({
                    title: 'Avoid !important',
                    description: '!important overrides the cascading nature of CSS and makes debugging difficult. Use more specific selectors instead.',
                    severity: 'low',
                    line: lineNum,
                    code: line.trim()
                });
            }
            // Check for very large z-index
            if (/z-index\s*:\s*(\d{4,})/.test(line)) {
                issues.push({
                    title: 'Excessive z-index value',
                    description: 'Very large z-index values are hard to manage. Use a z-index scale system instead.',
                    severity: 'low',
                    line: lineNum,
                    code: line.trim()
                });
            }
        });
        return issues;
    }
    analyzeGeneric(lines, content) {
        const issues = [];
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            // Check for very long lines
            if (line.length > 120) {
                issues.push({
                    title: 'Line too long',
                    description: `This line has ${line.length} characters. Keep lines under 120 characters for better readability.`,
                    severity: 'low',
                    line: lineNum,
                    code: line.substring(0, 50) + '...'
                });
            }
            // Check for trailing whitespace
            if (/\s+$/.test(line) && line.trim().length > 0) {
                issues.push({
                    title: 'Trailing whitespace',
                    description: 'This line has trailing whitespace which should be removed.',
                    severity: 'low',
                    line: lineNum,
                    fix: line.trimEnd()
                });
            }
        });
        return issues;
    }
}
exports.CodeAnalyzer = CodeAnalyzer;
//# sourceMappingURL=codeAnalyzer.js.map