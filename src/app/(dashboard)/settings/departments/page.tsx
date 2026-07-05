'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Boxes, Users, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  departmentsService,
  type Department,
  type DistributionRule,
} from '@/features/settings/services/departments.service';
import { membersService } from '@/features/settings/services/members.service';

const RULE_LABEL: Record<DistributionRule, string> = {
  MANUAL: 'Manual — vendedores pegam da fila do setor',
  ROUND_ROBIN: 'Rodízio — distribui automático entre os do setor',
  LEAST_BUSY: 'Menos ocupado — quem tem menos conversas',
};

export default function SettingsDepartmentsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [rule, setRule] = useState<DistributionRule>('MANUAL');
  const [editing, setEditing] = useState<Department | null>(null);
  const [managing, setManaging] = useState<string | null>(null);

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsService.list(),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['departments'] });

  const create = async () => {
    if (!name.trim()) return toast.error('Dê um nome ao setor');
    try {
      await departmentsService.create({ name: name.trim(), distributionRule: rule });
      setName(''); setRule('MANUAL'); setCreating(false);
      toast.success('Setor criado'); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao criar'); }
  };
  const save = async (d: Department) => {
    try {
      await departmentsService.update(d.id, { name: d.name, distributionRule: d.distributionRule });
      setEditing(null); toast.success('Setor salvo'); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar'); }
  };
  const remove = async (d: Department) => {
    if (!confirm(`Remover o setor "${d.name}"? As conversas dele ficam sem setor.`)) return;
    try { await departmentsService.remove(d.id); toast.success('Setor removido'); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao remover'); }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            <Boxes className="h-5 w-5" /> Setores de atendimento
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Organize a equipe por setor (Vendas, Designer, Suporte, Pós-vendas). As conversas entram no setor e ficam na fila dele.
          </p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90">
            <Plus className="h-4 w-4" /> Novo setor
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do setor (ex: Vendas)"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-950" />
            <select value={rule} onChange={(e) => setRule(e.target.value as DistributionRule)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-950">
              <option value="MANUAL">Manual (pegar da fila)</option>
              <option value="ROUND_ROBIN">Rodízio</option>
              <option value="LEAST_BUSY">Menos ocupado</option>
            </select>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => { setCreating(false); setName(''); }} className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancelar</button>
            <button onClick={create} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90">Criar</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="py-10 text-center text-sm text-zinc-400">Carregando…</p>
      ) : departments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <Boxes className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">Nenhum setor ainda</p>
          <p className="mt-1 text-xs text-zinc-500">Crie Vendas, Designer, Suporte, Pós-vendas.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {departments.map((d) => (
            <div key={d.id} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3 p-4">
                {editing?.id === d.id ? (
                  <>
                    <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-950" />
                    <select value={editing.distributionRule} onChange={(e) => setEditing({ ...editing, distributionRule: e.target.value as DistributionRule })}
                      className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-950">
                      <option value="MANUAL">Manual</option>
                      <option value="ROUND_ROBIN">Rodízio</option>
                      <option value="LEAST_BUSY">Menos ocupado</option>
                    </select>
                    <button onClick={() => save(editing)} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"><Check className="h-4 w-4" /></button>
                    <button onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {d.name}
                        {d.isDefault && <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800">padrão</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">{RULE_LABEL[d.distributionRule]}</p>
                    </div>
                    <button onClick={() => setManaging(managing === d.id ? null : d.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                      <Users className="h-3.5 w-3.5" /> {d._count?.agents ?? 0} {d._count?.agents === 1 ? 'vendedor' : 'vendedores'}
                    </button>
                    <button onClick={() => setEditing(d)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(d)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </>
                )}
              </div>
              {managing === d.id && <AgentManager departmentId={d.id} onChanged={refresh} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentManager({ departmentId, onChanged }: { departmentId: string; onChanged: () => void }) {
  const qc = useQueryClient();
  const { data: agents = [] } = useQuery({
    queryKey: ['dept-agents', departmentId],
    queryFn: () => departmentsService.agents(departmentId),
  });
  const { data: members = [] } = useQuery({ queryKey: ['org-members'], queryFn: () => membersService.list() });

  const inDept = new Set(agents.map((a) => a.userOrganization.user.id));
  const available = members.filter((m) => !inDept.has(m.user.id));

  const refresh = () => { qc.invalidateQueries({ queryKey: ['dept-agents', departmentId] }); onChanged(); };
  const add = async (userId: string) => {
    try { await departmentsService.addAgent(departmentId, userId); toast.success('Vendedor adicionado'); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
  };
  const remove = async (userId: string) => {
    try { await departmentsService.removeAgent(departmentId, userId); toast.success('Vendedor removido'); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
  };

  return (
    <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Vendedores neste setor</p>
      {agents.length === 0 ? (
        <p className="text-xs text-zinc-400">Nenhum ainda — adicione abaixo.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {agents.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 py-1 pl-2.5 pr-1.5 text-sm dark:bg-zinc-800">
              {a.userOrganization.user.name || a.userOrganization.user.email}
              <button onClick={() => remove(a.userOrganization.user.id)} className="rounded-full p-0.5 text-zinc-400 hover:bg-red-100 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
        </div>
      )}
      {available.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Adicionar</p>
          <div className="flex flex-wrap gap-2">
            {available.map((m) => (
              <button key={m.user.id} onClick={() => add(m.user.id)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-sm text-zinc-600 hover:border-primary hover:text-primary dark:border-zinc-700 dark:text-zinc-300">
                <Plus className="h-3.5 w-3.5" /> {m.user.name || m.user.email}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
