import { resolveLayout } from '@wavegrid/layout';
import { writeFileSync } from 'fs';
import type { Inquirerer, Question } from 'inquirerer';
import { join } from 'path';
import c from 'yanse';

import {
  buildConfig,
  CONFIG_FILENAME,
  type InitAnswers,
  knownPresets,
  serializeConfig,
  type ShapeKind
} from '../config-file';
import { getStore } from '../project';

interface RawArgv {
  [key: string]: unknown;
}

interface FullInitAnswers extends InitAnswers {
  projectName: string;
  createUser?: boolean;
  username?: string;
  password?: string;
  writeLocal?: boolean;
}

/**
 * `wavegrid init [name]` — create a project in the centralized store, generate
 * its secrets ONCE, and optionally add a first UI user + a local wavegrid.json.
 * Everything the CLI produces is plain configuration + generated secrets; there
 * is no shape-specific executable code.
 */
export async function runInit(argv: RawArgv, prompter: Inquirerer, cwd = process.cwd()): Promise<string> {
  const defaultName = typeof argv.project === 'string' ? argv.project : 'default';

  const questions: Question[] = [
    {
      type: 'text',
      name: 'projectName',
      message: 'Project name',
      default: defaultName
    },
    {
      type: 'list',
      name: 'shape',
      message: 'Layout shape',
      options: ['preset', 'grid', 'ring', 'filledRing'],
      default: 'preset'
    },
    {
      type: 'list',
      name: 'preset',
      message: 'Preset',
      options: knownPresets(),
      default: 'grid-7x7',
      when: (a: Partial<FullInitAnswers>) => a.shape === 'preset'
    },
    {
      type: 'number',
      name: 'cols',
      message: 'Grid columns',
      default: 7,
      when: (a: Partial<FullInitAnswers>) => a.shape === 'grid'
    },
    {
      type: 'number',
      name: 'rows',
      message: 'Grid rows',
      default: 7,
      when: (a: Partial<FullInitAnswers>) => a.shape === 'grid'
    },
    {
      type: 'number',
      name: 'count',
      message: 'Number of cannons',
      default: 6,
      when: (a: Partial<FullInitAnswers>) => a.shape === 'ring' || a.shape === 'filledRing'
    },
    {
      type: 'list',
      name: 'mode',
      message: 'Run mode (auto picks simple under the single-laptop threshold)',
      options: ['auto', 'simple', 'distributed'],
      default: 'auto'
    },
    {
      type: 'number',
      name: 'serverPort',
      message: 'Server port',
      default: 3000
    },
    {
      type: 'number',
      name: 'uiPort',
      message: 'UI port',
      default: 3003
    },
    {
      type: 'confirm',
      name: 'createUser',
      message: 'Create a UI login user now?',
      default: false
    },
    {
      type: 'text',
      name: 'username',
      message: 'Username',
      when: (a: Partial<FullInitAnswers>) => a.createUser === true
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password',
      when: (a: Partial<FullInitAnswers>) => a.createUser === true
    },
    {
      type: 'confirm',
      name: 'writeLocal',
      message: 'Also write a local wavegrid.json here?',
      default: false
    }
  ];

  const answers = (await prompter.prompt(argv, questions)) as unknown as FullInitAnswers;

  const normalized: InitAnswers = {
    ...answers,
    shape: answers.shape as ShapeKind
  };
  const projectName = answers.projectName || defaultName;

  const config = buildConfig(normalized);
  const layout = resolveLayout(config.layout);

  const store = getStore();
  store.createProject(projectName, config);
  const gen = store.generateSecrets(projectName);

  if (answers.createUser && answers.username && answers.password) {
    store.addUser(projectName, answers.username, answers.password);
  }

  let localPath: string | undefined;
  if (answers.writeLocal) {
    localPath = join(cwd, CONFIG_FILENAME);
    writeFileSync(localPath, serializeConfig(config));
  }

  console.log('');
  console.log(c.green(`  ✓ Created project ${c.bold(projectName)}`));
  console.log(`  → Layout:  ${c.cyan(layout.name)} (${layout.topology}, ${layout.count} cannons)`);
  console.log(`  → Mode:    ${c.cyan(config.mode ?? 'auto')}`);
  console.log(`  → Store:   ${c.gray(store.paths.root)}`);
  if (gen.generated.length) {
    console.log(`  → Secrets: ${c.green('generated')} ${c.gray(`(${gen.generated.join(', ')})`)}`);
  } else {
    console.log(`  → Secrets: ${c.gray('already present')}`);
  }
  if (answers.createUser && answers.username) {
    console.log(`  → User:    ${c.cyan(answers.username)}`);
  }
  if (localPath) console.log(`  → Wrote:   ${c.cyan(localPath)}`);
  console.log('');
  console.log(`  Start it with ${c.bold(`wavegrid start${projectName === 'default' ? '' : ` --project ${projectName}`}`)}`);
  console.log('');

  return projectName;
}
