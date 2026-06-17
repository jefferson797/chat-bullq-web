'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Loader2, MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import {
  autoRepliesService,
  type AutoReplyConfig,
  type Weekday,
} from '@/features/auto-replies/services/auto-replies.service';
import { useOrgId } from '@/hooks/use-org-query-key';

const DAYS: { key: Weekday; label: string }[] = [
  { key: 'mon', label: 'Segunda' },
  { key: 'tue', label: 'Terça' },
  { key: 'wed', label: 'Quarta' },
  { key: 'thu', label: 'Quinta' },
  { key: 'fri', label: 'Sexta' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
];

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Bahia',
  'America/Fortaleza',
  'America/Recife',
];

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

const inputCls =
  'rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

export default function SettingsAutoRepliesPage() {
  const orgId = useOrgId();
  const { data, isLoading } = useQuery({
    queryKey: ['auto-replies', orgId],
    queryFn: () => autoRepliesService.get(),
  });

  const [cfg, setCfg] = useState<AutoReplyConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setCfg(data);
  }, [data]);

  if (isLoading || !cfg) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const patch = (p: Partial<AutoReplyConfig>) => setCfg({ ...cfg, ...p });

  const dayWindow = (d: Weekday) => cfg.businessHours[d]?.[0] ?? ['09:00', '18:00'];
  const isOpen = (d: Weekday) => (cfg.businessHours[d]?.length ?? 0) > 0;
  const setDay = (d: Weekday, open: boolean, start?: string, end?: string) => {
    const [s, e] = dayWindow(d);
    patch({
      businessHours: {
        ...cfg.businessHours,
        [d]: open ? [[start ?? s, end ?? e]] : [],
      },
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await autoRepliesService.update(cfg);
      setCfg(saved);
      toast.success('Atendimento automático salvo');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const msgCard = (
    key: 'greeting' | 'lunchMsg' | 'offHours',
    title: string,
    desc: string,
    placeholder: string,
  ) => {
    const m = cfg[key];
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {title}
            </h4>
            <p className="text-xs text-zinc-500">{desc}</p>
          </div>
          <Toggle
            checked={m.enabled}
            onChange={(v) => patch({ [key]: { ...m, enabled: v } } as any)}
          />
        </div>
        <textarea
          value={m.text}
          onChange={(e) =>
            patch({ [key]: { ...m, text: e.target.value } } as any)
          }
          disabled={!m.enabled}
          rows={2}
          placeholder={placeholder}
          className={`${inputCls} mt-2 w-full resize-y disabled:opacity-50`}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Atendimento automático
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Mensagens automáticas de saudação, almoço e fora de expediente.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Ativado
          <Toggle checked={cfg.enabled} onChange={(v) => patch({ enabled: v })} />
        </label>
      </div>

      <div className={cfg.enabled ? '' : 'pointer-events-none opacity-50'}>
        {/* Horário de funcionamento */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Horário de funcionamento
              </h3>
            </div>
            <select
              value={cfg.timezone}
              onChange={(e) => patch({ timezone: e.target.value })}
              className={inputCls}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            {DAYS.map(({ key, label }) => {
              const [s, e] = dayWindow(key);
              const open = isOpen(key);
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex w-28 items-center gap-2">
                    <Toggle checked={open} onChange={(v) => setDay(key, v)} />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {label}
                    </span>
                  </div>
                  {open ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={s}
                        onChange={(ev) => setDay(key, true, ev.target.value, e)}
                        className={inputCls}
                      />
                      <span className="text-zinc-400">às</span>
                      <input
                        type="time"
                        value={e}
                        onChange={(ev) => setDay(key, true, s, ev.target.value)}
                        className={inputCls}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-zinc-400">Fechado</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Almoço + anti-spam */}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Toggle
                checked={cfg.lunch.enabled}
                onChange={(v) => patch({ lunch: { ...cfg.lunch, enabled: v } })}
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Almoço
              </span>
              <input
                type="time"
                value={cfg.lunch.start}
                disabled={!cfg.lunch.enabled}
                onChange={(e) =>
                  patch({ lunch: { ...cfg.lunch, start: e.target.value } })
                }
                className={`${inputCls} disabled:opacity-50`}
              />
              <span className="text-zinc-400">às</span>
              <input
                type="time"
                value={cfg.lunch.end}
                disabled={!cfg.lunch.enabled}
                onChange={(e) =>
                  patch({ lunch: { ...cfg.lunch, end: e.target.value } })
                }
                className={`${inputCls} disabled:opacity-50`}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Repetir no máx. 1x a cada
              </span>
              <input
                type="number"
                min={0}
                value={cfg.antiSpamHours}
                onChange={(e) =>
                  patch({ antiSpamHours: Number(e.target.value) })
                }
                className={`${inputCls} w-16`}
              />
              <span className="text-sm text-zinc-500">horas (por contato)</span>
            </div>
          </div>
        </div>

        {/* Mensagens */}
        <div className="mt-4 flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Mensagens
          </h3>
        </div>
        <div className="mt-2 space-y-3">
          {msgCard(
            'greeting',
            'Saudação',
            'Enviada na 1ª mensagem de uma nova conversa (em horário de atendimento).',
            'Olá! Seja bem-vindo 👋',
          )}
          {msgCard(
            'lunchMsg',
            'Horário de almoço',
            'Enviada quando o cliente escreve durante o intervalo de almoço.',
            'Estamos em horário de almoço…',
          )}
          {msgCard(
            'offHours',
            'Fora de expediente',
            'Enviada quando o cliente escreve fora do horário de funcionamento.',
            'Recebemos sua mensagem fora do horário…',
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </button>
      </div>
    </div>
  );
}
