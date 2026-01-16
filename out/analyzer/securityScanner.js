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
exports.SecurityScanner = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class SecurityScanner {
    // Patterns for detecting secrets
    secretPatterns = [
        { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
        { name: 'AWS Secret Key', pattern: /[A-Za-z0-9/+=]{40}/g, severity: 'critical' },
        { name: 'Generic API Key', pattern: /api[_-]?key\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi, severity: 'high' },
        { name: 'Generic Secret', pattern: /secret\s*[:=]\s*['"][A-Za-z0-9_\-]{10,}['"]/gi, severity: 'high' },
        { name: 'Password in code', pattern: /password\s*[:=]\s*['"][^'"]{3,}['"]/gi, severity: 'critical' },
        { name: 'Private Key', pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g, severity: 'critical' },
        { name: 'GitHub Token', pattern: /ghp_[A-Za-z0-9]{36}/g, severity: 'critical' },
        { name: 'Slack Token', pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/g, severity: 'critical' },
        { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, severity: 'high' },
        { name: 'Database URL', pattern: /(mongodb|postgres|mysql|redis):\/\/[^\s'"]+/gi, severity: 'high' }
    ];
    async scan(filePath) {
        const issues = [];
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const ext = path.extname(filePath).toLowerCase();
            // Scan for hardcoded secrets
            issues.push(...this.scanForSecrets(lines, content));
            // Scan for injection vulnerabilities
            if (['.js', '.jsx', '.ts', '.tsx', '.py', '.php'].includes(ext)) {
                issues.push(...this.scanForInjections(lines, ext));
            }
            // Scan for authentication issues
            issues.push(...this.scanForAuthIssues(lines, ext));
            // Scan for crypto issues
            issues.push(...this.scanForCryptoIssues(lines, ext));
            // Scan for data exposure
            issues.push(...this.scanForDataExposure(lines, ext));
        }
        catch (error) {
            console.error(`Error scanning ${filePath}:`, error);
        }
        return issues;
    }
    scanForSecrets(lines, content) {
        const issues = [];
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            for (const { name, pattern, severity } of this.secretPatterns) {
                pattern.lastIndex = 0; // Reset regex
                if (pattern.test(line)) {
                    issues.push({
                        title: `Hardcoded ${name} detected`,
                        description: `Found what looks like a ${name} in your code. Secrets should never be committed to source control. Use environment variables instead.`,
                        severity,
                        line: lineNum,
                        category: 'secrets',
                        cwe: 'CWE-798',
                        code: this.maskSecret(line.trim()),
                        fix: 'Move this secret to an environment variable or secrets manager.'
                    });
                }
            }
        });
        return issues;
    }
    scanForInjections(lines, ext) {
        const issues = [];
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            // SQL Injection
            if (/\$\{.*\}/.test(line) && /SELECT|INSERT|UPDATE|DELETE|FROM|WHERE/i.test(line)) {
                issues.push({
                    title: 'Potential SQL Injection',
                    description: 'You\'re inserting variables directly into a SQL query. A hacker could type malicious SQL and access your entire database! Use parameterized queries instead.',
                    severity: 'critical',
                    line: lineNum,
                    category: 'injection',
                    cwe: 'CWE-89',
                    code: line.trim(),
                    fix: 'Use parameterized queries or prepared statements.'
                });
            }
            // String concatenation in SQL
            if (/["'].*\s*\+\s*\w+.*["'].*(?:SELECT|INSERT|UPDATE|DELETE)/i.test(line)) {
                issues.push({
                    title: 'SQL query with string concatenation',
                    description: 'Building SQL queries with string concatenation is dangerous. User input could contain SQL commands that destroy your data.',
                    severity: 'critical',
                    line: lineNum,
                    category: 'injection',
                    cwe: 'CWE-89',
                    code: line.trim()
                });
            }
            // Command Injection
            if (/exec\s*\(|system\s*\(|spawn\s*\(|shell_exec/i.test(line)) {
                if (/\$|`|\+/.test(line)) {
                    issues.push({
                        title: 'Potential Command Injection',
                        description: 'You\'re passing dynamic data to a system command. An attacker could run any command on your server! Validate and sanitize all inputs.',
                        severity: 'critical',
                        line: lineNum,
                        category: 'injection',
                        cwe: 'CWE-78',
                        code: line.trim()
                    });
                }
            }
            // XSS - innerHTML with dynamic content
            if (/innerHTML\s*=/.test(line) && /\$\{|\+.*\w/.test(line)) {
                issues.push({
                    title: 'Potential XSS vulnerability',
                    description: 'You\'re inserting dynamic content directly into innerHTML. An attacker could inject malicious scripts that steal user data! Use textContent or sanitize the input.',
                    severity: 'high',
                    line: lineNum,
                    category: 'xss',
                    cwe: 'CWE-79',
                    code: line.trim(),
                    fix: 'Use textContent instead of innerHTML, or sanitize with DOMPurify.'
                });
            }
            // document.write
            if (/document\.write\s*\(/.test(line)) {
                issues.push({
                    title: 'Dangerous document.write() usage',
                    description: 'document.write() can be exploited for XSS attacks and is considered bad practice. Use DOM manipulation methods instead.',
                    severity: 'high',
                    line: lineNum,
                    category: 'xss',
                    cwe: 'CWE-79',
                    code: line.trim()
                });
            }
            // eval() with user input
            if (/eval\s*\(/.test(line)) {
                issues.push({
                    title: 'Dangerous eval() usage',
                    description: 'eval() executes any code passed to it. If this includes user input, an attacker can run any JavaScript! This is one of the most dangerous functions.',
                    severity: 'critical',
                    line: lineNum,
                    category: 'injection',
                    cwe: 'CWE-95',
                    code: line.trim(),
                    fix: 'Find an alternative to eval(). Consider JSON.parse() for data or Function() for specific cases.'
                });
            }
            // Python specific
            if (ext === '.py') {
                if (/subprocess|os\.system|os\.popen/.test(line) && /format\(|%s|\+|f['"]/.test(line)) {
                    issues.push({
                        title: 'Command injection risk',
                        description: 'You\'re passing formatted strings to a subprocess. User input could execute malicious commands!',
                        severity: 'critical',
                        line: lineNum,
                        category: 'injection',
                        cwe: 'CWE-78',
                        code: line.trim()
                    });
                }
            }
        });
        return issues;
    }
    scanForAuthIssues(lines, ext) {
        const issues = [];
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            // Weak JWT secret
            if (/jwt\.sign|jsonwebtoken/i.test(line)) {
                const nextLines = lines.slice(index, index + 5).join('\n');
                if (/secret\s*[:=]\s*['"][^'"]{0,15}['"]/i.test(nextLines)) {
                    issues.push({
                        title: 'Weak JWT secret',
                        description: 'Your JWT secret appears to be too short or simple. Attackers can brute-force weak secrets to forge tokens! Use a strong, random secret at least 32 characters long.',
                        severity: 'critical',
                        line: lineNum,
                        category: 'authentication',
                        cwe: 'CWE-326'
                    });
                }
            }
            // Disabled SSL verification
            if (/verify\s*[:=]\s*false|InsecureRequestWarning|rejectUnauthorized\s*[:=]\s*false/i.test(line)) {
                issues.push({
                    title: 'SSL verification disabled',
                    description: 'Disabling SSL verification makes your app vulnerable to man-in-the-middle attacks. Attackers can intercept all your traffic!',
                    severity: 'high',
                    line: lineNum,
                    category: 'authentication',
                    cwe: 'CWE-295',
                    code: line.trim()
                });
            }
            // Hardcoded session
            if (/session[_-]?secret\s*[:=]\s*['"][^'"]+['"]/i.test(line)) {
                issues.push({
                    title: 'Hardcoded session secret',
                    description: 'Session secrets should never be in your code. An attacker who sees your code can forge session cookies!',
                    severity: 'critical',
                    line: lineNum,
                    category: 'authentication',
                    cwe: 'CWE-798',
                    code: this.maskSecret(line.trim())
                });
            }
        });
        return issues;
    }
    scanForCryptoIssues(lines, ext) {
        const issues = [];
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            // Weak hash algorithms
            if (/md5|sha1\s*\(/i.test(line) && !/hmac/i.test(line)) {
                issues.push({
                    title: 'Weak cryptographic hash',
                    description: 'MD5 and SHA1 are broken! They can be cracked in minutes. Use SHA-256 or better, or bcrypt for passwords.',
                    severity: 'high',
                    line: lineNum,
                    category: 'cryptography',
                    cwe: 'CWE-328',
                    code: line.trim(),
                    fix: 'Use SHA-256, SHA-3, or bcrypt for passwords.'
                });
            }
            // Math.random() for security
            if (/Math\.random\(\)/.test(line)) {
                const context = lines.slice(index - 2, index + 3).join('\n').toLowerCase();
                if (/token|key|secret|password|auth|session|random.*id/i.test(context)) {
                    issues.push({
                        title: 'Insecure random number generation',
                        description: 'Math.random() is NOT cryptographically secure! An attacker can predict the next values. Use crypto.getRandomValues() for security purposes.',
                        severity: 'high',
                        line: lineNum,
                        category: 'cryptography',
                        cwe: 'CWE-338',
                        code: line.trim(),
                        fix: 'Use crypto.getRandomValues() or crypto.randomBytes().'
                    });
                }
            }
            // Hardcoded IV/nonce
            if (/iv\s*[:=]|nonce\s*[:=]/i.test(line) && /['"][A-Za-z0-9+/=]{8,}['"]/.test(line)) {
                issues.push({
                    title: 'Hardcoded encryption IV/nonce',
                    description: 'Initialization vectors must be random for each encryption! Reusing IVs breaks your encryption completely.',
                    severity: 'critical',
                    line: lineNum,
                    category: 'cryptography',
                    cwe: 'CWE-329',
                    code: line.trim()
                });
            }
        });
        return issues;
    }
    scanForDataExposure(lines, ext) {
        const issues = [];
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            // Sensitive data in logs
            if (/console\.|log\.|logger\.|print\(/i.test(line)) {
                if (/password|secret|token|apikey|credit|ssn|social/i.test(line)) {
                    issues.push({
                        title: 'Sensitive data in logs',
                        description: 'You might be logging sensitive information! Logs are often stored insecurely and accessed by many people.',
                        severity: 'high',
                        line: lineNum,
                        category: 'data-exposure',
                        cwe: 'CWE-532',
                        code: line.trim()
                    });
                }
            }
            // Sensitive data in URL
            if (/\?.*password|&.*password|token=|apikey=|secret=/i.test(line)) {
                issues.push({
                    title: 'Sensitive data in URL',
                    description: 'Passing secrets in URLs is dangerous! They get logged, cached, and appear in browser history. Use POST body or headers instead.',
                    severity: 'high',
                    line: lineNum,
                    category: 'data-exposure',
                    cwe: 'CWE-598',
                    code: line.trim()
                });
            }
            // Exposed stack traces
            if (/stack\s*[:=]|stacktrace|\.stack\b/i.test(line)) {
                const context = lines.slice(index, index + 3).join('\n');
                if (/res\.|response\.|send\(|json\(/i.test(context)) {
                    issues.push({
                        title: 'Stack trace exposed to user',
                        description: 'Never show stack traces to users! They reveal your code structure and help attackers find vulnerabilities.',
                        severity: 'medium',
                        line: lineNum,
                        category: 'data-exposure',
                        cwe: 'CWE-209',
                        code: line.trim()
                    });
                }
            }
        });
        return issues;
    }
    maskSecret(line) {
        // Mask potential secrets in the code for display
        return line.replace(/['"][A-Za-z0-9_\-+=/.]{10,}['"]/g, '"***MASKED***"');
    }
}
exports.SecurityScanner = SecurityScanner;
//# sourceMappingURL=securityScanner.js.map