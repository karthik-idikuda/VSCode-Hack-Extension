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
exports.QualityChecker = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class QualityChecker {
    async check(filePath) {
        const issues = [];
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const ext = path.extname(filePath).toLowerCase();
            // Check for duplicate code blocks
            issues.push(...this.checkForDuplicates(lines));
            // Check complexity
            issues.push(...this.checkComplexity(lines, ext));
            // Check naming conventions
            issues.push(...this.checkNaming(lines, ext));
            // Check code smells
            issues.push(...this.checkCodeSmells(lines, ext));
            // Check for dead code
            issues.push(...this.checkDeadCode(lines, ext));
            // Check documentation
            issues.push(...this.checkDocumentation(lines, ext));
        }
        catch (error) {
            console.error(`Error checking quality for ${filePath}:`, error);
        }
        return issues;
    }
    checkForDuplicates(lines) {
        const issues = [];
        const lineGroups = new Map();
        // Find duplicate lines (excluding trivial ones)
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (trimmed.length > 30 && !this.isTrivialLine(trimmed)) {
                const existing = lineGroups.get(trimmed);
                if (existing) {
                    existing.push(index + 1);
                }
                else {
                    lineGroups.set(trimmed, [index + 1]);
                }
            }
        });
        // Report significant duplicates
        lineGroups.forEach((lineNumbers, code) => {
            if (lineNumbers.length > 2) {
                issues.push({
                    title: 'Duplicate code detected',
                    description: `This exact code appears ${lineNumbers.length} times in this file (lines: ${lineNumbers.join(', ')}). Consider extracting it into a reusable function.`,
                    severity: 'medium',
                    line: lineNumbers[0],
                    category: 'duplication',
                    code: code.substring(0, 60) + '...'
                });
            }
        });
        return issues;
    }
    checkComplexity(lines, ext) {
        const issues = [];
        let currentFunction = '';
        let functionStart = 0;
        let nestingLevel = 0;
        let maxNesting = 0;
        let conditionCount = 0;
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            // Detect function start
            const funcMatch = line.match(/(?:function\s+(\w+)|(\w+)\s*[=:]\s*(?:async\s*)?\(?[^)]*\)?\s*=>|def\s+(\w+))/);
            if (funcMatch) {
                if (currentFunction && (maxNesting > 4 || conditionCount > 10)) {
                    issues.push({
                        title: `Complex function: ${currentFunction}`,
                        description: `This function is too complex (nesting: ${maxNesting}, conditions: ${conditionCount}). Complex functions are hard to understand and test. Break it into smaller pieces.`,
                        severity: maxNesting > 5 || conditionCount > 15 ? 'high' : 'medium',
                        line: functionStart,
                        category: 'complexity'
                    });
                }
                currentFunction = funcMatch[1] || funcMatch[2] || funcMatch[3] || 'anonymous';
                functionStart = lineNum;
                maxNesting = 0;
                conditionCount = 0;
                nestingLevel = 0;
            }
            // Track nesting
            const openBraces = (line.match(/{/g) || []).length;
            const closeBraces = (line.match(/}/g) || []).length;
            nestingLevel += openBraces - closeBraces;
            maxNesting = Math.max(maxNesting, nestingLevel);
            // Count conditions
            if (/\bif\b|\belse\b|\bfor\b|\bwhile\b|\bswitch\b|\bcase\b|\?/.test(line)) {
                conditionCount++;
            }
        });
        // Check last function
        if (currentFunction && (maxNesting > 4 || conditionCount > 10)) {
            issues.push({
                title: `Complex function: ${currentFunction}`,
                description: `This function is too complex (nesting: ${maxNesting}, conditions: ${conditionCount}). Complex functions are hard to understand and test. Break it into smaller pieces.`,
                severity: maxNesting > 5 || conditionCount > 15 ? 'high' : 'medium',
                line: functionStart,
                category: 'complexity'
            });
        }
        return issues;
    }
    checkNaming(lines, ext) {
        const issues = [];
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            // Check for single letter variables (except loop counters)
            const singleLetterMatch = line.match(/\b(let|const|var)\s+([a-z])\s*=/);
            if (singleLetterMatch && !['i', 'j', 'k', 'x', 'y', 'z'].includes(singleLetterMatch[2])) {
                issues.push({
                    title: 'Single-letter variable name',
                    description: `Variable '${singleLetterMatch[2]}' has a meaningless name. Use descriptive names that explain the purpose.`,
                    severity: 'low',
                    line: lineNum,
                    category: 'naming',
                    code: line.trim()
                });
            }
            // Check for meaningless names
            const badNames = line.match(/\b(let|const|var)\s+(data|temp|tmp|foo|bar|baz|test|stuff|thing)\s*=/i);
            if (badNames) {
                issues.push({
                    title: 'Vague variable name',
                    description: `'${badNames[2]}' is too generic. Use a name that describes what the variable actually contains.`,
                    severity: 'low',
                    line: lineNum,
                    category: 'naming',
                    code: line.trim()
                });
            }
            // Check for incorrect casing (JS conventions)
            if (['.js', '.ts'].includes(ext)) {
                // Classes should be PascalCase
                const classMatch = line.match(/class\s+([a-z][a-zA-Z]*)/);
                if (classMatch) {
                    issues.push({
                        title: 'Class name should be PascalCase',
                        description: `Class '${classMatch[1]}' should start with an uppercase letter (PascalCase).`,
                        severity: 'low',
                        line: lineNum,
                        category: 'naming',
                        fix: `class ${classMatch[1].charAt(0).toUpperCase() + classMatch[1].slice(1)}`
                    });
                }
                // Constants should be UPPER_CASE
                const constMatch = line.match(/const\s+([A-Z][A-Z0-9_]+)\s*=/);
                if (constMatch && constMatch[1].includes('_') === false && constMatch[1].length > 3) {
                    // Already uppercase, but check if it's truly a constant
                }
            }
        });
        return issues;
    }
    checkCodeSmells(lines, ext) {
        const issues = [];
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            // Deep callback nesting (callback hell)
            const callbacks = (line.match(/\)\s*=>\s*{|\)\s*{\s*$/g) || []).length;
            if (callbacks > 1) {
                issues.push({
                    title: 'Callback nesting detected',
                    description: 'Multiple nested callbacks make code hard to read. Consider using async/await or breaking into smaller functions.',
                    severity: 'medium',
                    line: lineNum,
                    category: 'smell',
                    code: line.trim()
                });
            }
            // Long parameter list
            const params = line.match(/function\s*\w*\s*\(([^)]+)\)/);
            if (params && params[1].split(',').length > 5) {
                issues.push({
                    title: 'Too many function parameters',
                    description: 'Functions with many parameters are hard to use correctly. Consider using an options object instead.',
                    severity: 'medium',
                    line: lineNum,
                    category: 'smell',
                    code: line.trim()
                });
            }
            // Nested ternary
            if ((line.match(/\?/g) || []).length > 1) {
                issues.push({
                    title: 'Nested ternary operator',
                    description: 'Nested ternaries are confusing to read. Use if-else statements for complex conditions.',
                    severity: 'low',
                    line: lineNum,
                    category: 'smell',
                    code: line.trim()
                });
            }
            // Boolean comparison
            if (/===?\s*(true|false)\b|\b(true|false)\s*===?/.test(line)) {
                issues.push({
                    title: 'Unnecessary boolean comparison',
                    description: 'Comparing to true/false is redundant. Just use the boolean directly.',
                    severity: 'low',
                    line: lineNum,
                    category: 'smell',
                    code: line.trim(),
                    fix: 'Use the boolean directly: if (isReady) instead of if (isReady === true)'
                });
            }
            // God object detection (class with too many methods)
            // This is simplified - real implementation would track class scope
            if (/class\s+\w+/.test(line)) {
                const classContent = lines.slice(index, index + 200).join('\n');
                const methodCount = (classContent.match(/\b(public|private|protected)?\s*(async\s+)?\w+\s*\([^)]*\)\s*{/g) || []).length;
                if (methodCount > 15) {
                    issues.push({
                        title: 'Large class (possible God Object)',
                        description: 'This class has many methods. Consider splitting it into smaller, focused classes.',
                        severity: 'medium',
                        line: lineNum,
                        category: 'smell'
                    });
                }
            }
        });
        return issues;
    }
    checkDeadCode(lines, ext) {
        const issues = [];
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            // Unreachable code after return
            if (index > 0 && /^\s*\S/.test(line)) {
                const prevLine = lines[index - 1].trim();
                if (/^return\s|^throw\s|^break\s*;|^continue\s*;/.test(prevLine) && !/^}/.test(line.trim()) && !/^\/\/|^\/\*|^\*/.test(line.trim())) {
                    issues.push({
                        title: 'Unreachable code',
                        description: 'This code will never execute because there\'s a return/throw/break statement above it.',
                        severity: 'medium',
                        line: lineNum,
                        category: 'dead-code',
                        code: line.trim()
                    });
                }
            }
            // Commented out code blocks (heuristic)
            if (/^\/\/\s*(if|for|while|function|const|let|var|class)\s/.test(line.trim())) {
                issues.push({
                    title: 'Commented-out code',
                    description: 'Remove commented-out code. It clutters the file and version control already keeps history.',
                    severity: 'low',
                    line: lineNum,
                    category: 'dead-code',
                    code: line.trim()
                });
            }
            // Empty functions
            if (/\)\s*{\s*}\s*$/.test(line)) {
                issues.push({
                    title: 'Empty function body',
                    description: 'This function does nothing. Either implement it or remove it if not needed.',
                    severity: 'low',
                    line: lineNum,
                    category: 'dead-code',
                    code: line.trim()
                });
            }
        });
        return issues;
    }
    checkDocumentation(lines, ext) {
        const issues = [];
        let lastCommentLine = -10;
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            // Track comments
            if (/^\s*(\/\/|\/\*|\*|#)/.test(line)) {
                lastCommentLine = index;
            }
            // Check for functions without documentation
            const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)|(public|private|protected)\s+(?:async\s+)?(\w+)\s*\(/);
            if (funcMatch) {
                const funcName = funcMatch[1] || funcMatch[3];
                // Check if there's a comment/JSDoc above
                if (index - lastCommentLine > 2 && funcName && !funcName.startsWith('_')) {
                    issues.push({
                        title: `Missing documentation for ${funcName}`,
                        description: 'Important functions should have JSDoc comments explaining what they do, their parameters, and return value.',
                        severity: 'low',
                        line: lineNum,
                        category: 'documentation'
                    });
                }
            }
        });
        return issues;
    }
    isTrivialLine(line) {
        // Lines that are too trivial to count as duplicates
        return (line === '{' ||
            line === '}' ||
            line === '});' ||
            line === ');' ||
            line.startsWith('import ') ||
            line.startsWith('export ') ||
            line.startsWith('return ') ||
            line.startsWith('//') ||
            line.startsWith('/*') ||
            line.startsWith('*'));
    }
}
exports.QualityChecker = QualityChecker;
//# sourceMappingURL=qualityChecker.js.map