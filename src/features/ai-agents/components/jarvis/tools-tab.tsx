'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Wrench, Trash2, Edit2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiCatalogService,
  type AiTool,
} from '../../services/ai-catalog.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { ToolDialog } from './tool-dialog';

export function JarvisToolsTab() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AiTool | null>(null);

  const { data: tools, isLoading } = useQuery({
    queryKey: ['ai-tools', orgId],
    queryFn: () => aiCatalogService.listTools(),
  });

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ['ai-tools'] });

  const handleDelete = async (tool: AiTool) => {
    if (tool.source === 'BUILTIN') return;
    if (!confirm(`Excluir tool "${tool.name}"? Skills/agents que usam vão perder acesso.`))
      return;
    try {
      await aiCatalogService.removeTool(tool.id);
      toast.success('Tool excluída');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao excluir');
    }
  };

  const builtins = (tools ?? []).filter((t) => t.source === 'BUILTIN');
  const customs = (tools ?? []).filter((t) => t.source !== 'BUILTIN');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <Wrench className="h-5 w-5 text-primary" />
            Tools
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Funções que os agents podem chamar — built-in + customizadas (HTTP)
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nova tool customizada
        </button>
      </div>

      {isLoading && (
        <div className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      )}

      {/* Custom HTTP */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Customizadas — {customs.length}
        </h3>
        {customs.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-zinc-200 p-6 text-center dark:border-zinc-800">
            <p className="text-sm text-zinc-500">
              Nenhuma tool custom criada. Crie uma pra integrar com APIs externas
              (liberar acesso, consultar pedido, abrir ticket, etc).
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {customs.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onEdit={() => setEditing(tool)}
                onDelete={() => handleDelete(tool)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Built-in */}
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <Lock className="h-3 w-3" /> Built-in (sistema) — {builtins.length}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {builtins.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      <ToolDialog
        open={showCreate}
        tool={null}
        onClose={() => setShowCreate(false)}
        onSaved={() => {
          refresh();
          setShowCreate(false);
        }}
      />
      <ToolDialog
        open={!!editing}
        tool={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          refresh();
          setEditing(null);
        }}
      />
    </div>
  );
}

function ToolCard({
  tool,
  onEdit,
  onDelete,
}: {
  tool: AiTool;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isBuiltin = tool.source === 'BUILTIN';
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {tool.name}
            </code>
            {isBuiltin ? (
              <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500 dark:bg-zinc-800">
                builtin
              </span>
            ) : tool.source === 'CUSTOM_SQL' ? (
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] uppercase text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                SQL{tool.sqlReadOnly ? ' · RO' : ' · RW'}
              </span>
            ) : (
              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] uppercase text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                {tool.httpMethod}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-600 line-clamp-2 dark:text-zinc-400">
            {tool.description}
          </p>
          {!isBuiltin && tool.httpUrl && (
            <code className="mt-2 block truncate text-[11px] text-zinc-400">
              {tool.httpUrl}
            </code>
          )}
          {tool.source === 'CUSTOM_SQL' && tool.sqlConnectionRef && (
            <code className="mt-2 block truncate text-[11px] text-zinc-400">
              {`{{env.${tool.sqlConnectionRef}}}`}
            </code>
          )}
        </div>
        {!isBuiltin && (
          <div className="flex shrink-0 gap-1">
            <button
              onClick={onEdit}
              className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
