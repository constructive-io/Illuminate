import { KeyRound, MonitorSmartphone, RefreshCw, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import * as React from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RequiredSecretInfo, SessionInfo, UserAccount, UserRole } from '@/types/ipc';

const ROLE_STYLE = 'border-input bg-background h-8 rounded-md border px-2 text-sm';

function relativeTime(ts: number): string {
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function AddUserDialog({
  existing,
  onAdd,
  busy
}: {
  existing: string[];
  onAdd: (username: string, password: string, role: UserRole) => Promise<void>;
  busy: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [role, setRole] = React.useState<UserRole>('operator');
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setUsername('');
    setPassword('');
    setConfirm('');
    setRole('operator');
    setError(null);
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const trimmed = username.trim();
  const nameError =
    trimmed === ''
      ? 'Username is required.'
      : existing.includes(trimmed)
        ? 'That user already exists.'
        : null;
  const passwordError =
    password === ''
      ? 'Password is required.'
      : password !== confirm
        ? 'Passwords do not match.'
        : null;
  const valid = !nameError && !passwordError;

  const submit = async () => {
    setError(null);
    try {
      await onAdd(trimmed, password, role);
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size='sm'>
          <UserPlus />
          Add user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add UI user</DialogTitle>
          <DialogDescription>
            Creates a login for the artist UI. The password is hashed (scrypt) and never stored or
            shown in plain text.
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-4 px-6 py-2'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='wg-username'>Username</Label>
            <Input
              id='wg-username'
              autoFocus
              autoComplete='off'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {username !== '' && nameError && (
              <span className='text-destructive text-xs'>{nameError}</span>
            )}
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='wg-password'>Password</Label>
            <Input
              id='wg-password'
              type='password'
              autoComplete='new-password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='wg-confirm'>Confirm password</Label>
            <Input
              id='wg-confirm'
              type='password'
              autoComplete='new-password'
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {confirm !== '' && passwordError && (
              <span className='text-destructive text-xs'>{passwordError}</span>
            )}
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='wg-role'>Role</Label>
            <select
              id='wg-role'
              className={ROLE_STYLE}
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value='operator'>operator — use show controls</option>
              <option value='admin'>admin — manage users, roles &amp; sessions</option>
            </select>
          </div>
          {error && <span className='text-destructive text-sm'>{error}</span>}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !valid}>
            Add user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsersTab({
  users,
  onAdd,
  onRemove,
  onSetRole,
  busy
}: {
  users: UserAccount[];
  onAdd: (username: string, password: string, role: UserRole) => Promise<void>;
  onRemove: (username: string) => void;
  onSetRole: (username: string, role: UserRole) => void;
  busy: boolean;
}) {
  const names = users.map((u) => u.username);
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className='flex flex-col gap-3 pt-4'>
      <div className='flex items-center justify-between'>
        <span className='text-muted-foreground text-sm'>
          {users.length} UI login{users.length === 1 ? '' : 's'}
        </span>
        <AddUserDialog existing={names} onAdd={onAdd} busy={busy} />
      </div>
      {users.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Users />
            </EmptyMedia>
            <EmptyTitle>No users yet</EmptyTitle>
            <EmptyDescription>Add a login so the artist UI can be signed into.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead className='w-56'>Role</TableHead>
              <TableHead className='w-16' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              // Don't let the last admin be demoted or removed — that would lock
              // administration out of the project.
              const lastAdmin = u.role === 'admin' && adminCount <= 1;
              return (
                <TableRow key={u.username}>
                  <TableCell className='font-medium'>{u.username}</TableCell>
                  <TableCell>
                    <select
                      className={ROLE_STYLE}
                      value={u.role}
                      disabled={busy || lastAdmin}
                      title={lastAdmin ? 'The last admin cannot be demoted.' : undefined}
                      onChange={(e) => onSetRole(u.username, e.target.value as UserRole)}
                    >
                      <option value='operator'>operator</option>
                      <option value='admin'>admin</option>
                    </select>
                  </TableCell>
                  <TableCell className='text-right'>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          disabled={busy || lastAdmin}
                          title={lastAdmin ? 'The last admin cannot be removed.' : 'Remove user'}
                        >
                          <Trash2 />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove “{u.username}”?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This user will no longer be able to sign into the UI, and any active
                            session of theirs is revoked.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onRemove(u.username)}
                            className='bg-destructive text-white hover:bg-destructive/90'
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function SessionsTab({
  sessions,
  onRevoke,
  onRefresh,
  busy
}: {
  sessions: SessionInfo[];
  onRevoke: (id: string) => void;
  onRefresh: () => void;
  busy: boolean;
}) {
  return (
    <div className='flex flex-col gap-3 pt-4'>
      <div className='flex items-center justify-between'>
        <span className='text-muted-foreground text-sm'>
          {sessions.length} active session{sessions.length === 1 ? '' : 's'}
        </span>
        <Button variant='outline' size='sm' disabled={busy} onClick={onRefresh}>
          <RefreshCw />
          Refresh
        </Button>
      </div>
      {sessions.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <MonitorSmartphone />
            </EmptyMedia>
            <EmptyTitle>Nobody logged in</EmptyTitle>
            <EmptyDescription>
              A session appears here whenever someone signs into the UI while the brain is running.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead className='w-16' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.id}>
                <TableCell className='font-medium'>{s.username}</TableCell>
                <TableCell>
                  <Badge variant={s.role === 'admin' ? 'default' : 'secondary'}>{s.role}</Badge>
                </TableCell>
                <TableCell className='font-mono text-xs'>{s.ip}</TableCell>
                <TableCell className='text-muted-foreground text-sm'>{relativeTime(s.lastSeen)}</TableCell>
                <TableCell className='text-right'>
                  <Button
                    variant='ghost'
                    size='sm'
                    disabled={busy}
                    title='Revoke session'
                    onClick={() => onRevoke(s.id)}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <span className='text-muted-foreground text-xs'>
        Revoking takes effect on the client's next token refresh — open sockets aren't force-closed.
      </span>
    </div>
  );
}

function SecretsTab({
  secrets,
  onGenerate,
  busy
}: {
  secrets: RequiredSecretInfo[];
  onGenerate: (force: boolean) => void;
  busy: boolean;
}) {
  const missing = secrets.filter((s) => !s.set).length;

  return (
    <div className='flex flex-col gap-3 pt-4'>
      <div className='flex items-center justify-between'>
        <span className='text-muted-foreground text-sm'>
          {missing === 0 ? 'All required secrets set' : `${missing} secret(s) missing`}
        </span>
        <div className='flex items-center gap-2'>
          {missing > 0 && (
            <Button size='sm' disabled={busy} onClick={() => onGenerate(false)}>
              <KeyRound />
              Generate missing
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant='outline' size='sm' disabled={busy}>
                <RefreshCw />
                Rotate all
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rotate all secrets?</AlertDialogTitle>
                <AlertDialogDescription>
                  This regenerates every secret. Receivers using the old <code>receiverKey</code>{' '}
                  and any live UI sessions will need to reconnect / sign in again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onGenerate(true)}>Rotate</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Secret</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className='w-24'>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {secrets.map((s) => (
            <TableRow key={s.name}>
              <TableCell className='font-mono text-sm'>{s.name}</TableCell>
              <TableCell className='text-muted-foreground text-sm'>{s.description}</TableCell>
              <TableCell>
                {s.set ? (
                  <Badge>set</Badge>
                ) : (
                  <Badge variant='destructive'>missing</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <span className='text-muted-foreground text-xs'>
        Secret values are never shown or sent to this window — only whether each is set.
      </span>
    </div>
  );
}

interface AccessRouteProps {
  project: string | null;
  users: UserAccount[];
  sessions: SessionInfo[];
  secrets: RequiredSecretInfo[];
  onAddUser: (username: string, password: string, role: UserRole) => Promise<void>;
  onRemoveUser: (username: string) => void;
  onSetUserRole: (username: string, role: UserRole) => void;
  onRevokeSession: (id: string) => void;
  onRefreshSessions: () => void;
  onGenerateSecrets: (force: boolean) => void;
  busy: boolean;
}

/** Access admin for one project: UI logins + their roles (admin/operator), the
 *  live login sessions an admin can revoke, and secret set/missing status. All
 *  write through the shared store — no secret values or password hashes ever
 *  cross IPC. This is the local privileged path (Electron main owns the store);
 *  a remote Electron uses the server's role-gated /api/admin endpoints instead. */
export function AccessRoute({
  project,
  users,
  sessions,
  secrets,
  onAddUser,
  onRemoveUser,
  onSetUserRole,
  onRevokeSession,
  onRefreshSessions,
  onGenerateSecrets,
  busy
}: AccessRouteProps) {
  if (!project) {
    return (
      <div className='p-4'>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <ShieldCheck />
            </EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>
              Pick a project on the Projects screen to manage its users and secrets.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4 p-4'>
      <span className='font-medium'>{project}</span>
      <Tabs defaultValue='users'>
        <TabsList>
          <TabsTrigger value='users'>Users</TabsTrigger>
          <TabsTrigger value='sessions'>Sessions</TabsTrigger>
          <TabsTrigger value='secrets'>Secrets</TabsTrigger>
        </TabsList>
        <TabsContent value='users'>
          <UsersTab
            users={users}
            onAdd={onAddUser}
            onRemove={onRemoveUser}
            onSetRole={onSetUserRole}
            busy={busy}
          />
        </TabsContent>
        <TabsContent value='sessions'>
          <SessionsTab
            sessions={sessions}
            onRevoke={onRevokeSession}
            onRefresh={onRefreshSessions}
            busy={busy}
          />
        </TabsContent>
        <TabsContent value='secrets'>
          <SecretsTab secrets={secrets} onGenerate={onGenerateSecrets} busy={busy} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
