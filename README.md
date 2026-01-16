# VS Code Hack Extension

## Overview
An experimental Visual Studio Code extension designed to augment the developer workflow with custom automation and "hacking" utilities. This extension pushes the boundaries of the VS Code API to provide unique, power-user features.

## Features
-   **Code Injection**: Automated insertion of code snippets.
-   **Workflow Automation**: Custom commands to chain editor actions.
-   **Environment Inspection**: Tools to analyze the current workspace state.
-   **Secret Management**: Secure handling of API keys within the editor.

## Technology Stack
-   **Platform**: VS Code Extension API.
-   **Language**: TypeScript / JavaScript.
-   **Build Tool**: Yeoman (yo code), Webpack.

## Usage Flow
1.  **Install**: Add the `.vsix` package to VS Code.
2.  **Activate**: Use the Command Palette (`Ctrl+Shift+P`) to trigger "Hack" commands.
3.  **Execute**: Extension performs the requested automation task.

## Quick Start
```bash
# Clone the repository
git clone https://github.com/Nytrynox/VSCode-Hack-Extension.git

# Install dependencies
npm install

# Compile
npm run compile

# Launch Debug Host
F5 (in VS Code)
```

## License
MIT License

## Author
**Karthik Idikuda**
