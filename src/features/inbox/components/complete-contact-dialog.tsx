'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, User, Phone, Building2, Mail, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { contactsService } from '@/features/contacts/services/contacts.service';

interface Props {
  contactId: string;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const INPUT =
  'mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
const LABEL = 'flex items-center gap-1.5 text-[12px] font-medium text-zinc-700 dark:text-zinc-300';

/** Completa o cadastro do contato direto na conversa (vai pro CRM/ERP). */
export function CompleteContactDialog({ contactId, open, onClose, onUpdated }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', company: '', email: '' });

  // Carrega os dados atuais do contato ao abrir.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    contactsService
      .getById(contactId)
      .then((c) => {
        if (!active) return;
        setForm({
          firstName: c.firstName ?? '',
          lastName: c.lastName ?? '',
          phone: c.phone ?? '',
          company: c.company ?? '',
          email: c.email ?? '',
        });
      })
      .catch(() => active && toast.error('Não foi possível carregar o contato'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, contactId]);

  // ESC fecha + trava o scroll do fundo.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, saving]);

  if (!open) return null;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.firstName.trim()) {
      toast.error('Informe ao menos o nome');
      return;
    }
    setSaving(true);
    try {
      await contactsService.update(contactId, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || null,
        company: form.company.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
      });
      toast.success('Cadastro atualizado');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      onUpdated?.();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !saving && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <UserPlus className="h-4 w-4 text-zinc-400" /> Cadastro do cliente
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          {loading ? (
            <div className="flex justify-center py-6 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>
                    <User className="h-3.5 w-3.5 text-zinc-400" /> Nome
                  </label>
                  <input value={form.firstName} onChange={set('firstName')} disabled={saving} className={INPUT} autoFocus />
                </div>
                <div>
                  <label className={LABEL}>Sobrenome</label>
                  <input value={form.lastName} onChange={set('lastName')} disabled={saving} className={INPUT} />
                </div>
              </div>
              <div>
                <label className={LABEL}>
                  <Phone className="h-3.5 w-3.5 text-zinc-400" /> Telefone
                </label>
                <input value={form.phone} onChange={set('phone')} disabled={saving} className={INPUT} placeholder="já vem do WhatsApp" />
              </div>
              <div>
                <label className={LABEL}>
                  <Building2 className="h-3.5 w-3.5 text-zinc-400" /> Empresa <span className="font-normal text-zinc-400">(se tiver)</span>
                </label>
                <input value={form.company} onChange={set('company')} disabled={saving} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>
                  <Mail className="h-3.5 w-3.5 text-zinc-400" /> E-mail <span className="font-normal text-zinc-400">(se tiver)</span>
                </label>
                <input type="email" value={form.email} onChange={set('email')} disabled={saving} className={INPUT} />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
