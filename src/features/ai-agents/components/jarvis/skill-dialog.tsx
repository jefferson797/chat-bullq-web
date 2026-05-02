'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiCatalogService,
  type AiSkill,
} from '../../services/ai-catalog.service';

interface Props {
  open: boolean;
  skill: AiSkill | null;
  onClose: () => void;
  onSaved: () => void;
}

export function SkillDialog({ open, skill, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [promptInstructions, setPromptInstructions] = useState('');
  const [toolIds, setToolIds] = useState<string[]>([]);
  const [changeNote, setChangeNote] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: tools } = useQuery({
    queryKey: ['ai-tools'],
    queryFn: () => aiCatalogService.listTools(),
    enabled: open,
  });

  useEffect(() => {
    if (skill) {
      setName(skill.name);
      setDescription(skill.description);
      setCategory(skill.category ?? '');
      setPromptInstructions(skill.promptInstructions ?? '');
      setToolIds(skill.tools.map((t) => t.tool.id));
      setChangeNote('');
    } else {
      setName('');
      setDescription('');
      setCategory('');
      setPromptInstructions('');
      setToolIds([]);
      setChangeNote('');
    }
  }, [skill, open]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name,
        description,
        category: category.trim() || undefined,
        promptInstructions: promptInstructions.trim() || undefined,
        toolIds,
        isActive: true,
        changeNote: changeNote.trim() || undefined,
      };
      if (skill) {
        await aiCatalogService.updateSkill(skill.id, payload);
        toast.success(`Skill atualizada (v${skill.currentVersion + 1})`);
      } else {
        await aiCatalogService.createSkill(payload);
        toast.success('Skill criada');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const toggleTool = (id: string) => {
    setToolIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {skill ? `Editar skill (v${skill.currentVersion} → v${skill.currentVersion + 1})` : 'Nova skill'}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Nome *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Liberação de acesso ao curso"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Categoria
              </label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="pos-venda / vendas / suporte"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Descrição *
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Coleta dados da compra e libera acesso ao curso"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Instruções extras (vão pro system prompt do agent)
            </label>
            <textarea
              rows={6}
              value={promptInstructions}
              onChange={(e) => setPromptInstructions(e.target.value)}
              placeholder="Quando o cliente passou e-mail e produto, tente liberar via unlockCourseAccess antes de transferir pra humano. Sempre confirme primeiro com o cliente que o e-mail está correto."
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Esse texto é injetado no prompt do agent quando essa skill estiver ativa.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Tools dessa skill
            </label>
            <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900/40">
              {(tools ?? []).map((t) => {
                const checked = toolIds.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-white dark:hover:bg-zinc-800 ${
                      checked ? 'bg-white dark:bg-zinc-800' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTool(t.id)}
                      className="mt-0.5 h-3.5 w-3.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-zinc-900 dark:text-zinc-100">
                          {t.name}
                        </code>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] uppercase ${
                            t.source === 'BUILTIN'
                              ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'
                              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                          }`}
                        >
                          {t.source === 'BUILTIN' ? 'builtin' : 'custom'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-500 line-clamp-1">
                        {t.description}
                      </p>
                    </div>
                  </label>
                );
              })}
              {(tools ?? []).length === 0 && (
                <p className="px-2 py-3 text-center text-xs text-zinc-400">
                  Nenhuma tool disponível.
                </p>
              )}
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              {toolIds.length} tool(s) selecionada(s)
            </p>
          </div>

          {skill && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Nota da mudança (vai pro changelog)
              </label>
              <input
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="Ex: ajustei o prompt pra ser mais paciente"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name || !description}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              'Salvando…'
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                {skill ? 'Salvar nova versão' : 'Criar'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
