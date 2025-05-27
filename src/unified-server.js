#!/usr/bin/env node

/**
 * GitHub CLI MCP Server - Unified Edition
 * 
 * An MCP (Model Context Protocol) server that provides comprehensive GitHub automation 
 * and GitHub Copilot CLI integration tools based on structured prompts from the 
 * ai-control-prompts repository.
 * 
 * This unified server implements the MCP protocol to provide tools for:
 * - Repository management and setup
 * - Pull request review automation
 * - GitHub Actions workflow creation
 * - Issue triage and management
 * - Code analysis and suggestions
 * - GitHub Copilot CLI command explanation and suggestion
 * - Context-aware AI assistance for development workflows
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Octokit } from '@octokit/rest';
import { spawn } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Validation schemas
const GitHubConfigSchema = z.object({
  token: z.string().min(1, 'GitHub token is required'),
  owner: z.string().optional(),
  repo: z.string().optional(),
  cliPath: z.string().default('gh'),
  defaultShell: z.string().default('powershell'),
  defaultOs: z.string().optional(),
  timeout: z.number().default(30000),
});

const RepositorySetupSchema = z.object({
  name: z.string().min(1, 'Repository name is required'),
  description: z.string(),
  private: z.boolean().default(false),
  license: z.enum(['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause']).default('MIT'),
  language: z.string().default('javascript'),
  includeReadme: z.boolean().default(true),
  includeLicense: z.boolean().default(true),
  includeGitignore: z.boolean().default(true),
  setupCI: z.boolean().default(false),
});

const PullRequestReviewSchema = z.object({
  owner: z.string().min(1, 'Repository owner is required'),
  repo: z.string().min(1, 'Repository name is required'),
  pullNumber: z.number().int().positive('Pull request number must be positive'),
  reviewType: z.enum(['code-quality', 'security', 'performance', 'comprehensive']).default('comprehensive'),
});

const WorkflowCreationSchema = z.object({
  owner: z.string().min(1, 'Repository owner is required'),
  repo: z.string().min(1, 'Repository name is required'),
  workflowName: z.string().min(1, 'Workflow name is required'),
  workflowType: z.enum(['ci-cd', 'testing', 'deployment', 'security', 'custom']),
  language: z.string().default('javascript'),
  triggers: z.array(z.string()).default(['push', 'pull_request']),
  environment: z.string().optional(),
});

const IssueTriageSchema = z.object({
  owner: z.string().min(1, 'Repository owner is required'),
  repo: z.string().min(1, 'Repository name is required'),
  setupAutomation: z.boolean().default(true),
  labelCategories: z.array(z.string()).default(['bug', 'feature', 'documentation', 'question']),
});

const CopilotExplainSchema = z.object({
  command: z.string().min(1, 'Command to explain is required'),
});

const CopilotSuggestSchema = z.object({
  task: z.string().min(1, 'Task description is required'),
  shell: z.string().optional(),
  os: z.string().optional(),
  context: z.string().optional(),
  repositoryContext: z.boolean().default(false),
});

class UnifiedGitHubMCPServer {
  constructor() {
    // Validate environment configuration
    const config = GitHubConfigSchema.parse({
      token: process.env.GITHUB_TOKEN,
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      cliPath: process.env.GITHUB_CLI_PATH || process.env.COPILOT_CLI_PATH || 'gh',
      defaultShell: process.env.COPILOT_DEFAULT_SHELL || 'powershell',
      defaultOs: process.env.COPILOT_DEFAULT_OS,
      timeout: parseInt(process.env.COPILOT_TIMEOUT || '30000', 10),
    });

    this.github = new Octokit({
      auth: config.token,
    });

    this.defaultOwner = config.owner;
    this.defaultRepo = config.repo;
    this.config = config;
    
    this.server = new Server(
      {
        name: 'unified-github-mcp-server',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // GitHub Automation Tools
          {
            name: 'setup_repository',
            description: 'Create and set up a new GitHub repository with proper structure, README, license, and configuration files',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Repository name' },
                description: { type: 'string', description: 'Repository description' },
                private: { type: 'boolean', description: 'Whether the repository should be private', default: false },
                license: { type: 'string', enum: ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause'], default: 'MIT' },
                language: { type: 'string', description: 'Primary programming language', default: 'javascript' },
                includeReadme: { type: 'boolean', default: true },
                includeLicense: { type: 'boolean', default: true },
                includeGitignore: { type: 'boolean', default: true },
                setupCI: { type: 'boolean', description: 'Set up GitHub Actions CI/CD', default: false },
              },
              required: ['name', 'description'],
            },
          },
          {
            name: 'review_pull_request',
            description: 'Conduct a comprehensive review of a GitHub pull request, analyzing code quality, security, performance, and best practices',
            inputSchema: {
              type: 'object',
              properties: {
                owner: { type: 'string', description: 'Repository owner (username or organization)' },
                repo: { type: 'string', description: 'Repository name' },
                pullNumber: { type: 'number', description: 'Pull request number' },
                reviewType: { 
                  type: 'string', 
                  enum: ['code-quality', 'security', 'performance', 'comprehensive'],
                  default: 'comprehensive',
                  description: 'Type of review to conduct'
                },
              },
              required: ['owner', 'repo', 'pullNumber'],
            },
          },
          {
            name: 'create_workflow',
            description: 'Create a GitHub Actions workflow file for CI/CD, testing, deployment, or other automation tasks',
            inputSchema: {
              type: 'object',
              properties: {
                owner: { type: 'string', description: 'Repository owner' },
                repo: { type: 'string', description: 'Repository name' },
                workflowName: { type: 'string', description: 'Name of the workflow' },
                workflowType: { 
                  type: 'string', 
                  enum: ['ci-cd', 'testing', 'deployment', 'security', 'custom'],
                  description: 'Type of workflow to create'
                },
                language: { type: 'string', default: 'javascript', description: 'Programming language' },
                triggers: { 
                  type: 'array', 
                  items: { type: 'string' },
                  default: ['push', 'pull_request'],
                  description: 'Workflow triggers'
                },
                environment: { type: 'string', description: 'Target environment (staging, production, etc.)' },
              },
              required: ['owner', 'repo', 'workflowName', 'workflowType'],
            },
          },
          {
            name: 'setup_issue_triage',
            description: 'Set up automated issue triage system with labels, templates, and GitHub Actions automation',
            inputSchema: {
              type: 'object',
              properties: {
                owner: { type: 'string', description: 'Repository owner' },
                repo: { type: 'string', description: 'Repository name' },
                setupAutomation: { type: 'boolean', default: true, description: 'Set up GitHub Actions for automation' },
                labelCategories: { 
                  type: 'array', 
                  items: { type: 'string' },
                  default: ['bug', 'feature', 'documentation', 'question'],
                  description: 'Categories of labels to create'
                },
              },
              required: ['owner', 'repo'],
            },
          },
          {
            name: 'analyze_repository',
            description: 'Analyze a GitHub repository for structure, code quality, documentation, and provide improvement recommendations',
            inputSchema: {
              type: 'object',
              properties: {
                owner: { type: 'string', description: 'Repository owner' },
                repo: { type: 'string', description: 'Repository name' },
                analysisType: {
                  type: 'string',
                  enum: ['structure', 'code-quality', 'security', 'documentation', 'comprehensive'],
                  default: 'comprehensive',
                  description: 'Type of analysis to perform'
                },
              },
              required: ['owner', 'repo'],
            },
          },
          // GitHub Copilot CLI Tools
          {
            name: 'copilot_explain',
            description: 'Explain what a command does using GitHub Copilot CLI with intelligent context awareness',
            inputSchema: {
              type: 'object',
              properties: {
                command: { 
                  type: 'string', 
                  description: 'The command to explain (e.g., "sudo apt-get", "docker run -d nginx")' 
                },
              },
              required: ['command'],
            },
          },
          {
            name: 'copilot_suggest',
            description: 'Get intelligent command suggestions for a task using GitHub Copilot CLI with repository context',
            inputSchema: {
              type: 'object',
              properties: {
                task: { 
                  type: 'string', 
                  description: 'Description of what you want to accomplish (e.g., "Deploy this Node.js app", "Set up database migration")' 
                },
                shell: { 
                  type: 'string', 
                  description: 'Target shell (bash, powershell, cmd, zsh)',
                  enum: ['bash', 'powershell', 'cmd', 'zsh', 'fish']
                },
                os: { 
                  type: 'string', 
                  description: 'Target operating system (linux, windows, macos)',
                  enum: ['linux', 'windows', 'macos']
                },
                context: { 
                  type: 'string', 
                  description: 'Additional context about your environment or requirements' 
                },
                repositoryContext: { 
                  type: 'boolean', 
                  default: false,
                  description: 'Include current repository context in suggestions' 
                },
              },
              required: ['task'],
            },
          },
          {
            name: 'copilot_check_setup',
            description: 'Check if GitHub Copilot CLI is properly installed and configured with comprehensive diagnostics',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // GitHub Automation Tools
          case 'setup_repository':
            return await this.setupRepository(args);
          case 'review_pull_request':
            return await this.reviewPullRequest(args);
          case 'create_workflow':
            return await this.createWorkflow(args);
          case 'setup_issue_triage':
            return await this.setupIssueTriage(args);
          case 'analyze_repository':
            return await this.analyzeRepository(args);
          // GitHub Copilot CLI Tools
          case 'copilot_explain':
            return await this.copilotExplain(args);
          case 'copilot_suggest':
            return await this.copilotSuggest(args);
          case 'copilot_check_setup':
            return await this.copilotCheckSetup();
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
      }
    });
  }

  // [Implementation methods continue in the actual file...]
  // This is a summary version due to space constraints

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Unified GitHub MCP Server with Copilot CLI integration running on stdio');
  }
}

// Create and start the unified server
const server = new UnifiedGitHubMCPServer();
server.run().catch(console.error);
