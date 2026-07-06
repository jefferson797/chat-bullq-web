'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Shield, ShieldCheck, User, Users, Copy, Link, X, Hash, Pencil, KeyRound, Check, Ban, Send, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { membersService, type Member, type Invitation } from '@/features/settings/services/members.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { MemberChannelsDrawer } from '@/features/settings/components/member-channels-drawer';

const roleLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  OWNER: { label: 'Proprietário', icon: ShieldCheck, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' },
  ADMIN: { label: 'Admin', icon: Shield, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
  AGENT: { label: 'Agente', icon: User, color: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400' },
};

export default function SettingsMembersPage() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('AGENT');
  const [inviting, setInviting] = useState(false);

  const orgId = useOrgId();
  const { data: members, isLoading } = useQuery({
    queryKey: ['members', orgId],
    queryFn: () => membersService.list(),
  });
  const { data: invitations = [] } = useQuery({
    queryKey: ['invitations', orgId],
    queryFn: () => membersService.listInvitations(),
  });
  const pendingInvites = invitations.filter((i) => i.status === 'PENDING');

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['members'] });
    queryClient.invalidateQueries({ queryKey: ['invitations'] });
  };

  const copyInvite = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/register?invite=${token}`);
    toast.success('Link copiado! Compartilhe com o convidado.');
  };
  const cancelInvite = async (inv: Invitation) => {
    if (!confirm(`Cancelar o convite de ${inv.email}?`)) return;
    try {
      await membersService.revokeInvitation(inv.id);
      toast.success('Convite cancelado');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cancelar');
    }
  };

  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [drawerMember, setDrawerMember] = useState<Member | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [pwdMember, setPwdMember] = useState<Member | null>(null);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const result = await membersService.invite({ email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      refresh();
      if (result.autoAccepted) {
        toast.success('Membro adicionado com sucesso!');
      } else {
        const link = `${window.location.origin}/register?invite=${result.token}`;
        setInviteLink(link);
        toast.success('Convite criado! Compartilhe o link com o membro.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao convidar');
    } finally {
      setInviting(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Link copiado!');
    }
  };

  const handleChangeRole = async (memberId: string, role: string) => {
    try {
      await membersService.updateRole(memberId, role);
      toast.success('Role atualizada');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar role');
    }
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (!confirm(`Remover ${name} da organização?`)) return;
    try {
      await membersService.remove(memberId);
      toast.success('Membro removido');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Membros</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Gerencie os membros da sua organização</p>
        </div>
      </div>

      <div className="mt-6 flex items-end gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
        <div className="flex-1">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Email do membro</label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            placeholder="email@exemplo.com"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Role</label>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="AGENT">Agente</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <button
          onClick={handleInvite}
          disabled={!inviteEmail.trim() || inviting}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" /> Convidar
        </button>
      </div>

      {inviteLink && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 dark:border-primary/30 dark:bg-primary/10">
          <Link className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Link de convite (expira em 7 dias)</p>
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{inviteLink}</p>
          </div>
          <button
            onClick={copyInviteLink}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setInviteLink(null)}
            className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {pendingInvites.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            <Send className="h-4 w-4" /> Convites pendentes ({pendingInvites.length})
          </h3>
          <div className="space-y-2">
            {pendingInvites.map((inv) => {
              const expired = new Date(inv.expiresAt).getTime() < Date.now();
              const roleMeta = roleLabels[inv.role] || roleLabels.AGENT;
              return (
                <div key={inv.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{inv.email}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${roleMeta.color}`}>{roleMeta.label}</span>
                      <Clock className="h-3 w-3" />
                      {expired ? (
                        <span className="text-red-500">expirado</span>
                      ) : (
                        `expira ${new Date(inv.expiresAt).toLocaleDateString('pt-BR')}`
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => copyInvite(inv.token)}
                    disabled={expired}
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <Link className="h-3.5 w-3.5" /> Copiar link
                  </button>
                  <button
                    onClick={() => cancelInvite(inv)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                  >
                    <X className="h-3.5 w-3.5" /> Cancelar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Membro</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Canais</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Entrou em</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-50 dark:border-zinc-800">
                  <td className="px-4 py-3"><div className="h-4 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                  <td className="px-4 py-3" />
                </tr>
              ))
            ) : !members?.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <Users className="mx-auto h-10 w-10 text-zinc-200 dark:text-zinc-700" />
                  <p className="mt-3 text-sm text-zinc-500">Nenhum membro encontrado</p>
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const roleMeta = roleLabels[m.role] || roleLabels.AGENT;
                const RoleIcon = roleMeta.icon;
                return (
                  <tr key={m.id} className="border-b border-zinc-50 dark:border-zinc-800">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium dark:bg-zinc-800">
                          {m.user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{m.user.name}</p>
                          <p className="text-[11px] text-zinc-400">{m.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {m.role === 'OWNER' ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${roleMeta.color}`}>
                          <RoleIcon className="h-3 w-3" /> {roleMeta.label}
                        </span>
                      ) : (
                        <select
                          value={m.role}
                          onChange={(e) => handleChangeRole(m.id, e.target.value)}
                          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="AGENT">Agente</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {/* OWNER tem acesso intrínseco a tudo (mesmo canais
                          PRIVATE). ADMIN herda os ORG por padrão mas
                          precisa de grant explícito pra PRIVATE — daí
                          ganha o botão "Gerenciar" também. AGENT só vê
                          o que tem grant. */}
                      {m.role === 'OWNER' ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          Acesso total
                        </span>
                      ) : (
                        <button
                          onClick={() => setDrawerMember(m)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          data-testid="member-channels-btn"
                        >
                          <Hash className="h-3 w-3" /> Gerenciar
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {new Date(m.joinedAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!m.user.isActive && (
                          <span className="mr-1 inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                            <Ban className="h-3 w-3" /> bloqueado
                          </span>
                        )}
                        {m.role !== 'OWNER' && (
                          <>
                            <button
                              onClick={() => setEditMember(m)}
                              title="Editar (nome / acesso)"
                              className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setPwdMember(m)}
                              title="Redefinir senha"
                              className="rounded p-1.5 text-zinc-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/20"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemove(m.id, m.user.name)}
                              title="Remover da organização"
                              className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {editMember && (
        <EditMemberDialog
          member={editMember}
          onClose={() => setEditMember(null)}
          onSaved={() => { setEditMember(null); refresh(); }}
        />
      )}
      {pwdMember && (
        <ResetPasswordDialog
          member={pwdMember}
          onClose={() => setPwdMember(null)}
        />
      )}

      <MemberChannelsDrawer
        open={!!drawerMember}
        member={
          drawerMember
            ? {
                // Backend resolves member by userId; the existing list returns
                // userOrganization rows where `userId` is the field we need.
                id: drawerMember.userId,
                name: drawerMember.user.name,
                role: drawerMember.role,
              }
            : null
        }
        onClose={() => setDrawerMember(null)}
        onSaved={refresh}
      />
    </div>
  );
}

const overlay = 'fixed inset-0 z-50 flex items-center justify-center p-4';
const dialogCard = 'relative z-50 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900';
const field = 'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

function EditMemberDialog({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(member.user.name);
  const [isActive, setIsActive] = useState(member.user.isActive);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast.error('O nome não pode ficar vazio');
    setSaving(true);
    try {
      await membersService.updateMember(member.id, { name: name.trim(), isActive });
      toast.success('Membro atualizado');
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={overlay}>
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={dialogCard}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Editar membro</h3>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-0.5 text-xs text-zinc-400">{member.user.email}</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} autoFocus />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
            Acesso ativo
          </label>
          {!isActive && (
            <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              Bloqueado: este usuário não conseguirá entrar em nenhum sistema até ser reativado.
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancelar</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            <Check className="h-4 w-4" /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function genPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out + '@' + Math.floor(Math.random() * 90 + 10);
}

function ResetPasswordDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const save = async () => {
    if (password.trim().length < 6) return toast.error('A senha precisa ter pelo menos 6 caracteres');
    setSaving(true);
    try {
      await membersService.resetPassword(member.id, password.trim());
      setDone(true);
      toast.success('Senha redefinida');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao redefinir');
    } finally {
      setSaving(false);
    }
  };

  const copy = () => { navigator.clipboard.writeText(password); toast.success('Senha copiada'); };

  return (
    <div className={overlay}>
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={dialogCard}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <KeyRound className="h-4 w-4" /> Redefinir senha
          </h3>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-0.5 text-xs text-zinc-400">{member.user.name} · {member.user.email}</p>

        {done ? (
          <div className="mt-4">
            <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Senha redefinida! ✅</p>
              <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">Copie e entregue ao membro. Ele pode trocá-la depois no próprio perfil.</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded bg-white px-2 py-1.5 font-mono text-sm dark:bg-zinc-800">{password}</code>
                <button onClick={copy} className="rounded-md bg-primary px-2.5 py-1.5 text-white hover:opacity-90"><Copy className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">Concluir</button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 text-xs text-zinc-500">
              Como admin, você define uma nova senha — a senha antiga não é revelada (fica criptografada). Entregue a nova ao membro; ele pode trocá-la depois.
            </p>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Nova senha</label>
              <div className="flex items-center gap-2">
                <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mín. 6 caracteres" className={`${field} font-mono`} autoFocus />
                <button onClick={() => setPassword(genPassword())} className="shrink-0 rounded-md border border-zinc-300 px-2.5 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">Gerar</button>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancelar</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">Redefinir senha</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
