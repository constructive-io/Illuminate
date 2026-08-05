# @wavegrid/settings

Centralized settings for Wavegrid, backed by [appstash](https://www.npmjs.com/package/appstash).

Everything that used to live in scattered env vars, a repo-root `.users` file, and
cwd-relative `.state/` now lives in **one** per-user store under `~/.wavegrid`:

```
~/.wavegrid/
  config/
    config.json            # the ACTIVE project's non-secret config (confstash `user` layer)
    projects.json          # project registry + active pointer
    secrets/<project>.json # generated secrets, mode 0600
  data/projects/<project>/
    config.json            # this project's stored non-secret config
    users.json             # UI users (scrypt-hashed passwords)
    state/                 # server persisted state
  logs/<project>/          # server + receiver logs
```

Secrets and users are **generated once** (`wavegrid init` / `wavegrid secrets init` /
`wavegrid users add`). At runtime everything is explicit: `requireSecret()` throws a
clear, actionable error if a secret is missing rather than silently defaulting.

The same store is shared across the CLI, server, receiver, and UI — and a future
Electron app can encrypt it at rest by supplying a `SecretCodec`.

```ts
import { openStore } from '@wavegrid/settings';

const store = openStore();                 // ~/.wavegrid  (override baseDir in tests)
store.createProject('ring-6-demo', config);
store.generateSecrets('ring-6-demo');      // one-time
const jwt = store.requireSecret('ring-6-demo', 'jwtSecret'); // throws if unset
```
