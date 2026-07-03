import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

import type { GovernanceMode } from '@aaes-os/platform-core';
import { PlatformClient } from '@aaes-os/platform-sdk';

export interface CliConfig {
  baseUrl: string;
  apiKey?: string;
  sessionId?: string;
  ownerId?: string;
  governanceProfile?: GovernanceMode;
}

const CONFIG_DIR = path.join(homedir(), '.organism');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export function loadConfig(): CliConfig {
  if (!existsSync(CONFIG_PATH)) {
    return { baseUrl: process.env.PLATFORM_API_URL ?? 'http://localhost:4100' };
  }
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as CliConfig;
}

export function saveConfig(config: CliConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function createClient(config: CliConfig = loadConfig()): PlatformClient {
  return new PlatformClient({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    sessionId: config.sessionId,
    governanceProfile: config.governanceProfile,
  });
}

export const COMMANDS = {
  login: 'Authenticate and save session (organism login --owner <id> [--profile balanced])',
  'keys generate': 'Generate a new API key (organism keys generate --label <name>)',
  'keys list': 'List API keys (organism keys list)',
  publish: 'Publish a capability (organism publish --id <id> --name <name> --organ <organ> --version <semver>)',
  governance: 'Inspect governance profiles (organism governance [--profile strict])',
  test: 'Test a module version (organism test --module <id> --version <semver>)',
  workflow: 'Run a cross-organism workflow (organism workflow --file <json>)',
  connect: 'Connect to a remote organism (organism connect --organism <id>)',
  usage: 'Show billing usage (organism usage)',
  completion: 'Print shell completion script (organism completion [--shell bash|powershell|zsh])',
  help: 'Show help (organism help [command])',
} as const;

export function printHelp(command?: string): void {
  if (command && command in COMMANDS) {
    console.log(COMMANDS[command as keyof typeof COMMANDS]);
    return;
  }
  console.log('organism — AAES super-platform CLI\n');
  for (const [name, desc] of Object.entries(COMMANDS)) {
    console.log(`  ${name.padEnd(18)} ${desc}`);
  }
}

export function printCompletion(shell: string): void {
  const cmds = Object.keys(COMMANDS).map((c) => c.split(' ')[0]).filter((v, i, a) => a.indexOf(v) === i);
  if (shell === 'powershell') {
    console.log(`
Register-ArgumentCompleter -CommandName organism -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)
  $commands = @(${cmds.map((c) => `'${c}'`).join(', ')})
  $commands | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
    [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
  }
}
`.trim());
    return;
  }
  if (shell === 'zsh') {
    console.log(`
_organism() {
  local commands=(${cmds.join(' ')})
  _describe 'command' commands
}
compdef _organism organism
`.trim());
    return;
  }
  console.log(`
_organism_completions() {
  local cur=\${COMP_WORDS[COMP_CWORD]}
  local commands="${cmds.join(' ')}"
  COMPREPLY=($(compgen -W "$commands" -- "$cur"))
}
complete -F _organism_completions organism
`.trim());
}

export function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = { _: argv[0] ?? 'help' };
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else if (!args._ || args._ === 'help') {
      args._ = arg;
    }
  }
  return args;
}

export async function runCli(rawArgv: string[]): Promise<number> {
  const positional: string[] = [];
  const args: Record<string, string | boolean> = {};

  for (let i = 0; i < rawArgv.length; i++) {
    const arg = rawArgv[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = rawArgv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  const command = positional[0] ?? 'help';
  const subcommand = positional[1];

  if (command === 'help' || args.help) {
    printHelp(typeof args.command === 'string' ? args.command : undefined);
    return 0;
  }

  if (command === 'completion') {
    printCompletion(typeof args.shell === 'string' ? args.shell : 'bash');
    return 0;
  }

  const config = loadConfig();
  const client = createClient(config);

  try {
    switch (command) {
      case 'login': {
        const ownerId = String(args.owner ?? process.env.USER ?? process.env.USERNAME ?? 'developer');
        const profile = (args.profile as GovernanceMode | undefined) ?? 'balanced';
        const session = await client.login(ownerId, profile);
        saveConfig({ ...config, sessionId: session.sessionId, ownerId, governanceProfile: profile });
        console.log(`Logged in as ${ownerId} (${profile}) — session ${session.sessionId}`);
        break;
      }
      case 'keys': {
        const sub = subcommand ?? 'list';
        if (sub === 'generate') {
          const result = await client.createApiKey(String(args.label ?? 'cli-key'));
          console.log(`API key created: ${result.key}`);
          console.log('Store this key securely — it will not be shown again.');
        } else {
          const keys = await client.listApiKeys();
          console.table(keys);
        }
        break;
      }
      case 'publish': {
        const record = await client.publishCapability({
          id: String(args.id),
          name: String(args.name),
          description: String(args.description ?? ''),
          organId: String(args.organ),
          version: String(args.version),
        });
        console.log(`Published ${record.id}@${record.currentVersion}`);
        break;
      }
      case 'governance': {
        const profiles = await client.listGovernanceProfiles();
        if (args.profile) {
          const p = profiles.find((pr) => pr.id === args.profile);
          console.log(JSON.stringify(p, null, 2));
        } else {
          console.table(profiles.map((p) => ({ id: p.id, name: p.name, tier: p.billingTier })));
        }
        break;
      }
      case 'test': {
        const result = await client.testModule(String(args.module), String(args.version));
        console.log(result.passed ? 'PASS' : 'FAIL');
        for (const check of result.checks) console.log(`  • ${check}`);
        return result.passed ? 0 : 1;
      }
      case 'workflow': {
        const file = String(args.file);
        const spec = JSON.parse(readFileSync(file, 'utf8')) as {
          steps: Array<{ organismId: string; capabilityId: string; input: Record<string, unknown> }>;
        };
        const result = await client.runWorkflow(spec.steps);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case 'connect': {
        const conn = await client.connectOrganism(String(args.organism));
        console.log(JSON.stringify(conn, null, 2));
        break;
      }
      case 'usage': {
        const usage = await client.getUsage();
        console.log(JSON.stringify(usage, null, 2));
        break;
      }
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        return 1;
    }
    return 0;
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return 1;
  }
}
