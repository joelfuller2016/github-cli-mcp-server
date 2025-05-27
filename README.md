# GitHub CLI MCP Server

🚀 **Unified MCP server for GitHub automation and Copilot CLI integration**

A comprehensive Model Context Protocol (MCP) server that provides GitHub automation tools with structured prompt integration.

## 🎯 Key Features

- **Repository Management**: Create and setup repositories with proper structure
- **Pull Request Reviews**: Automated comprehensive code analysis  
- **Workflow Generation**: GitHub Actions workflows for CI/CD
- **Issue Triage**: Automated issue management systems
- **Repository Analysis**: Health checks and improvement recommendations
- **GitHub Copilot CLI**: Command explanation and intelligent suggestions

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Protocol**: Model Context Protocol (MCP)
- **API**: GitHub REST API with Octokit
- **Validation**: Zod schemas
- **Testing**: Node.js test runner
- **Linting**: ESLint + Prettier

## 🚀 Quick Start

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Configure environment**: Copy `.env.example` to `.env` and add your GitHub token
4. **Test the server**: `npm test`
5. **Run the server**: `npm start`

## 📖 Documentation

- See [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md) for detailed usage examples
- Check [docs/](docs/) for comprehensive documentation
- Review [examples/](examples/) for implementation examples

## 🔧 Configuration

The server requires a GitHub Personal Access Token with the following permissions:
- `repo` (Full control of private repositories)
- `workflow` (Update GitHub Actions workflows)  
- `admin:repo_hook` (Admin access to repository hooks)

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run validate      # Full validation (lint + test)
```

## 📦 Available Tools

1. **setup_repository** - Create and configure new repositories
2. **review_pull_request** - Comprehensive PR analysis
3. **create_workflow** - Generate GitHub Actions workflows
4. **setup_issue_triage** - Automated issue management
5. **analyze_repository** - Repository health analysis
6. **copilot_explain** - Command explanation via GitHub Copilot CLI
7. **copilot_suggest** - Intelligent command suggestions
8. **copilot_check_setup** - Verify Copilot CLI configuration

## 🎨 Project Structure

```
github-cli-mcp-server/
├── src/
│   ├── server.js           # Legacy server implementation
│   └── unified-server.js   # Main unified server (recommended)
├── test/
│   └── server.test.js      # Comprehensive test suite
├── examples/
│   └── *.js               # Usage examples
├── docs/
│   └── *.md               # Documentation
├── scripts/
│   └── *.ps1              # Setup scripts
└── .github/
    └── workflows/         # CI/CD workflows
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run validation: `npm run validate`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) for the protocol specification
- [GitHub API](https://docs.github.com/en/rest) for the comprehensive API
- [Anthropic Claude](https://claude.ai/) for MCP support and AI assistance

---

**Made with ❤️ for the developer community**
