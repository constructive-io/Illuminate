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

interface RawArgv {
  [key: string]: unknown;
}

/**
 * `wavegrid init` — prompt for a shape + run mode and write a config file.
 * Everything the CLI produces is plain configuration; there is no
 * shape-specific executable code.
 */
export async function runInit(argv: RawArgv, prompter: Inquirerer, cwd = process.cwd()): Promise<string> {
  const questions: Question[] = [
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
      when: (a: Partial<InitAnswers>) => a.shape === 'preset'
    },
    {
      type: 'number',
      name: 'cols',
      message: 'Grid columns',
      default: 7,
      when: (a: Partial<InitAnswers>) => a.shape === 'grid'
    },
    {
      type: 'number',
      name: 'rows',
      message: 'Grid rows',
      default: 7,
      when: (a: Partial<InitAnswers>) => a.shape === 'grid'
    },
    {
      type: 'number',
      name: 'count',
      message: 'Number of cannons',
      default: 6,
      when: (a: Partial<InitAnswers>) => a.shape === 'ring' || a.shape === 'filledRing'
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
    }
  ];

  const answers = (await prompter.prompt(argv, questions)) as unknown as InitAnswers;

  const normalized: InitAnswers = {
    ...answers,
    shape: answers.shape as ShapeKind
  };

  const config = buildConfig(normalized);
  const layout = resolveLayout(config.layout);
  const path = join(cwd, CONFIG_FILENAME);
  writeFileSync(path, serializeConfig(config));

  console.log('');
  console.log(c.green(`  ✓ Wrote ${CONFIG_FILENAME}`));
  console.log(`  → Layout: ${c.cyan(layout.name)} (${layout.topology}, ${layout.count} cannons)`);
  console.log(`  → Mode:   ${c.cyan(config.mode)}`);
  console.log('');
  console.log(`  Start it with ${c.bold('wavegrid start')}`);
  console.log('');

  return path;
}
