'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Package, X, Tag } from 'lucide-react';
import { toast } from 'sonner';
import {
  productsService,
  type Product,
  type ProductPayload,
} from '@/features/settings/services/products.service';

function normalizeSlug(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+/, '');
}

type Draft = {
  slug: string;
  name: string;
  category: string;
  shortLine: string;
  price: string;
  targetAudience: string;
  paymentLink: string;
  pitch: string;
  differentiators: string; // separado por vírgula na UI
  isActive: boolean;
};

const EMPTY: Draft = {
  slug: '', name: '', category: '', shortLine: '', price: '',
  targetAudience: '', paymentLink: '', pitch: '', differentiators: '', isActive: true,
};

function toDraft(p: Product): Draft {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category ?? '',
    shortLine: p.shortLine,
    price: p.price ?? '',
    targetAudience: p.targetAudience ?? '',
    paymentLink: p.paymentLink ?? '',
    pitch: p.pitch,
    differentiators: (p.differentiators ?? []).join(', '),
    isActive: p.isActive,
  };
}

function toPayload(d: Draft): ProductPayload {
  return {
    slug: normalizeSlug(d.slug),
    name: d.name.trim(),
    category: d.category.trim() || undefined,
    shortLine: d.shortLine.trim(),
    price: d.price.trim() || undefined,
    targetAudience: d.targetAudience.trim() || undefined,
    paymentLink: d.paymentLink.trim() || undefined,
    pitch: d.pitch.trim(),
    differentiators: d.differentiators
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    isActive: d.isActive,
  };
}

export default function SettingsProductsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsService.list(),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['products'] });

  const valid = draft.slug.trim() && draft.name.trim() && draft.shortLine.trim() && draft.pitch.trim();

  const startCreate = () => { setDraft(EMPTY); setEditingId(null); setCreating(true); };
  const startEdit = (p: Product) => { setDraft(toDraft(p)); setEditingId(p.id); setCreating(false); };
  const cancel = () => { setCreating(false); setEditingId(null); setDraft(EMPTY); };

  const save = async () => {
    if (!valid) return toast.error('Preencha slug, nome, resumo e descrição');
    try {
      if (editingId) {
        await productsService.update(editingId, toPayload(draft));
        toast.success('Produto atualizado');
      } else {
        await productsService.create(toPayload(draft));
        toast.success('Produto criado');
      }
      cancel(); refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || (e instanceof Error ? e.message : 'Erro ao salvar'));
    }
  };

  const remove = async (p: Product) => {
    if (!confirm(`Remover "${p.name}" do catálogo?`)) return;
    try { await productsService.remove(p.id); toast.success('Produto removido'); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao remover'); }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <Package className="h-5 w-5" /> Catálogo de Produtos
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Cadastre seus serviços com preço e descrição. Ex.: DTF têxtil, DTF UV, gravação e corte a laser.
          </p>
        </div>
        {!creating && !editingId && (
          <button onClick={startCreate} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90">
            <Plus className="h-4 w-4" /> Novo produto
          </button>
        )}
      </div>

      {(creating || editingId) && (
        <ProductForm draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} valid={!!valid} editing={!!editingId} />
      )}

      <div className="mt-6 space-y-2">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-zinc-400">Carregando…</p>
        ) : products.length === 0 && !creating ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
            <Package className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">Nenhum produto ainda</p>
            <p className="mt-1 text-xs text-zinc-500">Cadastre DTF têxtil, DTF UV, gravação e corte a laser.</p>
          </div>
        ) : (
          products.map((p) => (
            <div key={p.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{p.name}</span>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-medium text-primary">/{p.slug}</span>
                    {p.category && (
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-400"><Tag className="h-3 w-3" />{p.category}</span>
                    )}
                    {!p.isActive && <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800">inativo</span>}
                    {p.price && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">{p.price}</span>}
                  </div>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{p.shortLine}</p>
                  {p.differentiators?.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {p.differentiators.map((d, i) => (
                        <span key={i} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{d}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => startEdit(p)} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(p)} className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ProductForm({
  draft, setDraft, onSave, onCancel, valid, editing,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  valid: boolean;
  editing: boolean;
}) {
  const set = (k: keyof Draft, v: string | boolean) => setDraft({ ...draft, [k]: v });
  const input = 'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';
  const label = 'mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400';

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{editing ? 'Editar produto' : 'Novo produto'}</h3>
        <button onClick={onCancel} className="rounded p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Nome *</label>
          <input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="DTF Têxtil" className={input} />
        </div>
        <div>
          <label className={label}>Atalho (slug) *</label>
          <input value={draft.slug} onChange={(e) => set('slug', normalizeSlug(e.target.value))} placeholder="dtf-textil" className={`${input} font-mono`} />
        </div>
        <div>
          <label className={label}>Categoria</label>
          <input value={draft.category} onChange={(e) => set('category', e.target.value)} placeholder="Impressão" className={input} />
        </div>
        <div>
          <label className={label}>Preço</label>
          <input value={draft.price} onChange={(e) => set('price', e.target.value)} placeholder="R$ 45/m²" className={input} />
        </div>
      </div>
      <div>
        <label className={label}>Resumo (uma linha) *</label>
        <input value={draft.shortLine} onChange={(e) => set('shortLine', e.target.value)} placeholder="Impressão DTF para tecidos, cores vivas e alta durabilidade" className={input} />
      </div>
      <div>
        <label className={label}>Descrição / argumento de venda *</label>
        <textarea value={draft.pitch} onChange={(e) => set('pitch', e.target.value)} rows={4} placeholder="Detalhe o serviço: aplicação, materiais, acabamento, prazos…" className={`${input} resize-y`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Público-alvo</label>
          <input value={draft.targetAudience} onChange={(e) => set('targetAudience', e.target.value)} placeholder="Brindeiros e revendedores" className={input} />
        </div>
        <div>
          <label className={label}>Link de pagamento</label>
          <input value={draft.paymentLink} onChange={(e) => set('paymentLink', e.target.value)} placeholder="https://…" className={input} />
        </div>
      </div>
      <div>
        <label className={label}>Diferenciais (separe por vírgula)</label>
        <input value={draft.differentiators} onChange={(e) => set('differentiators', e.target.value)} placeholder="Entrega rápida, sem pedido mínimo, arte conferida" className={input} />
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <input type="checkbox" checked={draft.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
        Ativo (aparece no catálogo)
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancelar</button>
        <button onClick={onSave} disabled={!valid} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
          {editing ? 'Salvar' : 'Criar produto'}
        </button>
      </div>
    </div>
  );
}
