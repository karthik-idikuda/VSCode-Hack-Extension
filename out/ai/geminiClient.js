"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiClient = void 0;
class GeminiClient {
    apiKey;
    context;
    baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    constructor(context) {
        this.context = context;
    }
    setApiKey(key) {
        this.apiKey = key;
    }
    async analyze(code, language, issueType) {
        if (!this.apiKey) {
            return this.getOfflineAnalysis(code, language, issueType);
        }
        try {
            const prompt = this.buildAnalysisPrompt(code, language, issueType);
            const response = await this.callGeminiAPI(prompt);
            return response;
        }
        catch (error) {
            console.error('Gemini API error:', error);
            return this.getOfflineAnalysis(code, language, issueType);
        }
    }
    async generateFix(code, issue) {
        if (!this.apiKey) {
            return issue.fix || null;
        }
        try {
            const prompt = this.buildFixPrompt(code, issue);
            const response = await this.callGeminiAPI(prompt);
            return this.extractCodeFromResponse(response);
        }
        catch (error) {
            console.error('Error generating fix:', error);
            return issue.fix || null;
        }
    }
    async explainIssue(issue) {
        if (!this.apiKey) {
            return issue.description;
        }
        try {
            const prompt = `
You are a friendly coding mentor explaining a code issue to a developer.
Explain the following issue in simple, conversational language:

Issue: ${issue.title}
Category: ${issue.category || issue.type}
Severity: ${issue.severity}
Code: ${issue.code || 'N/A'}

Explain:
1. What exactly is wrong (in 1-2 sentences)
2. Why this is a problem (real-world consequences)
3. How to fix it (specific steps)

Keep the explanation friendly, like you're talking to a colleague. Use analogies if helpful.
            `;
            return await this.callGeminiAPI(prompt);
        }
        catch (error) {
            return issue.description;
        }
    }
    async chat(message, context) {
        if (!this.apiKey) {
            return this.getOfflineResponse(message);
        }
        try {
            const prompt = `
You are CodeForge AI, a friendly and knowledgeable coding assistant specializing in code security and quality.

Current project context:
${context}

User message: ${message}

Respond helpfully and conversationally. If asked about code issues, explain in simple terms.
If asked for fixes, provide code examples.
Keep responses concise but helpful.
            `;
            return await this.callGeminiAPI(prompt);
        }
        catch (error) {
            return this.getOfflineResponse(message);
        }
    }
    async callGeminiAPI(prompt) {
        const url = `${this.baseUrl}?key=${this.apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                        parts: [{
                                text: prompt
                            }]
                    }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024
                }
            })
        });
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate response.';
    }
    buildAnalysisPrompt(code, language, issueType) {
        return `
Analyze this ${language} code for ${issueType} issues.
For each issue found, explain:
1. What's wrong
2. Why it's a problem
3. How to fix it

Code:
\`\`\`${language}
${code}
\`\`\`

Respond in a friendly, conversational tone.
        `;
    }
    buildFixPrompt(code, issue) {
        return `
Fix the following issue in this code:

Issue: ${issue.title}
Description: ${issue.description}
Line: ${issue.line}

Code:
\`\`\`
${code}
\`\`\`

Provide ONLY the fixed code, no explanations. Make the minimal change necessary to fix the issue.
        `;
    }
    extractCodeFromResponse(response) {
        // Try to extract code from markdown code blocks
        const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
        if (codeMatch) {
            return codeMatch[1].trim();
        }
        // If no code block, check if the entire response looks like code
        if (response.includes('{') || response.includes('function') || response.includes('const')) {
            return response.trim();
        }
        return null;
    }
    getOfflineAnalysis(code, language, issueType) {
        return `Offline analysis: Found potential ${issueType} issues in ${language} code. Connect to Gemini API for detailed AI analysis.`;
    }
    getOfflineResponse(message) {
        const responses = {
            'help': 'I can help you analyze code, find vulnerabilities, and improve code quality. Commands: analyze, fix, explain.',
            'analyze': 'Click "Analyze Workspace" or press Cmd+Shift+A to scan your project for issues.',
            'fix': 'Click "Fix All" to automatically fix detected issues, or fix them one by one from the dashboard.',
            'default': 'I\'m CodeForge AI! I can analyze your code for security issues and quality problems. Set up your Gemini API key for full AI features.'
        };
        const key = Object.keys(responses).find(k => message.toLowerCase().includes(k)) || 'default';
        return responses[key];
    }
}
exports.GeminiClient = GeminiClient;
//# sourceMappingURL=geminiClient.js.map