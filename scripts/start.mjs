import { spawn } from 'node:child_process';

const rawArgs = process.argv.slice(2).filter((argument) => argument !== '--');

const projectAliases = new Map([
  ['core', 'core'],
  ['apps/core', 'core'],
  ['apps/core/', 'core'],
  ['ai-worker', 'ai-worker'],
  ['apps/ai-worker', 'ai-worker'],
  ['apps/ai-worker/', 'ai-worker'],
  ['cli', 'cli'],
  ['apps/cli', 'cli'],
  ['apps/cli/', 'cli'],
]);

const projectArgumentIndex = rawArgs.findIndex(
  (argument) => !argument.startsWith('-'),
);
const requestedProject =
  projectArgumentIndex === -1 ? 'core' : rawArgs[projectArgumentIndex];
const project = projectAliases.get(requestedProject);

if (!project) {
  console.error(
    `Unknown Nest project "${requestedProject}". Use core, ai-worker, cli, or apps/<project>.`,
  );
  process.exit(1);
}

const nestArguments = ['exec', 'nest', 'start', project];
if (projectArgumentIndex !== -1) {
  nestArguments.push(...rawArgs.filter((_, index) => index !== projectArgumentIndex));
} else {
  nestArguments.push(...rawArgs);
}

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const child = spawn(pnpmCommand, nestArguments, {
  env: process.env,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`Unable to start Nest project ${project}: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
