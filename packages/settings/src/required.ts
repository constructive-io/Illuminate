import type { StorePaths } from './paths';
import { hasSecret, type SecretName } from './secrets';

export interface RequiredSecret {
  name: SecretName;
  description: string;
  set: boolean;
}

/**
 * The secrets a project requires to run fully, and whether each is present.
 * Both are always required: the server authenticates receivers with
 * `receiverKey`, and the UI signs sessions with `jwtSecret`.
 */
export function requiredSecrets(paths: StorePaths, project: string): RequiredSecret[] {
  return [
    {
      name: 'receiverKey',
      description: 'Shared key the receiver presents to the server (share across laptops in distributed mode).',
      set: hasSecret(paths, project, 'receiverKey')
    },
    {
      name: 'jwtSecret',
      description: 'HMAC secret the UI uses to sign login sessions.',
      set: hasSecret(paths, project, 'jwtSecret')
    }
  ];
}
