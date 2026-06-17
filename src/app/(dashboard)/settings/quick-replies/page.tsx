'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Zap } from 'lucide-react';
import { toast } from 'sonner';
import {
  quickRepliesService,
  type QuickReply,
} from '@/features/quick-replies/services/quick-replies.service';
import { useOrgId } from '@/hooks/use-org-query-key';

// remove a barra inicial e espaços — o atalho é sempre uma palavra
function normalizeShortcut(v: string) {
  return v.replace(/^\/+/, '').replace(/\s+/g, '').toLowerCase();
}

export default function SettingsQuickRepliesPage() {
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const [shortcut, setShortcut] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editShortcut, setEditShortcut] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const { data: replies, isLoading } = useQuery({
    queryKey: ['quick-replies', orgId],
    queryFn: () => quickRepliesService.list(),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['quick-replies'] });

  const canCreate = shortcut.trim() && title.trim() && content.trim();

  const handleCreate = async () => {
    if (!canCreate) return;
    try {
      await quickRepliesService.create({
        shortcut: normalizeShortcut(shortcut),
        title: title.trim(),
        content: content.trim(),
      });
      setShortcut('');
      setTitle('');
      setContent('');
      toast.success('Resposta rápida criada');
      refresh();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          (err instanceof Error ? err.message : 'Erro ao criar'),
      );
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await quickRepliesService.update(id, {
        shortcut: normalizeShortcut(editShortcut),
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      setEditingId(null);
      toast.success('Resposta atualizada');
      refresh();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          (err instanceof Error ? err.message : 'Erro ao atualizar'),
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta resposta rápida?')) return;
    try {
      await quickRepliesService.remove(id);
      toast.success('Resposta removida');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    }
  };

  const startEdit = (qr: QuickReply) => {
    setEditingId(qr.id);
    setEditShortcut(qr.shortcut);
    setEditTitle(qr.title);
    setEditContent(qr.content);
  };

  const inputCls =
    'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

  return (
    <div>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Respostas Rápidas
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          Cadastre respostas prontas e use{' '}
          <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            /atalho
          </kbd>{' '}
          no campo de mensagem para inseri-las.
        </p>
      </div>

      {/* Form de criação */}
      <div className="mt-6 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex gap-3">
          <div className="w-44">
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Atalho
            </label>
            <div className="flex items-center rounded-md border border-zinc-300 bg-white pl-2.5 focus-within:ring-2 focus-within:ring-primary dark:border-zinc-700 dark:bg-zinc-800">
              <span className="font-mono text-sm text-zinc-400">/</span>
              <input
                value={shortcut}
                onChange={(e) => setShortcut(normalizeShortcut(e.target.value))}
                placeholder="bomdia"
                className="w-full bg-transparent px-1 py-2 text-sm focus:outline-none dark:text-zinc-100"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Título
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Saudação de boas-vindas"
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Mensagem
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Olá! Tudo bem? Como posso te ajudar hoje?"
            rows={3}
            className={`${inputCls} resize-y`}
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Criar resposta
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="mt-6 space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))
        ) : !replies?.length ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Zap className="h-10 w-10 text-zinc-200 dark:text-zinc-700" />
            <p className="mt-3 text-sm text-zinc-500">
              Nenhuma resposta rápida cadastrada
            </p>
          </div>
        ) : (
          replies.map((qr) => (
            <div
              key={qr.id}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              {editingId === qr.id ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={editShortcut}
                      onChange={(e) =>
                        setEditShortcut(normalizeShortcut(e.target.value))
                      }
                      placeholder="atalho"
                      className={`${inputCls} w-40`}
                    />
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Título"
                      className={inputCls}
                    />
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className={`${inputCls} resize-y`}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleUpdate(qr.id)}
                      className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-medium text-primary">
                        /{qr.shortcut}
                      </span>
                      <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {qr.title}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-zinc-500 dark:text-zinc-400">
                      {qr.content}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => startEdit(qr)}
                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(qr.id)}
                      className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
