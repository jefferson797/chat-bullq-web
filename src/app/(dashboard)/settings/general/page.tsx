'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Upload, Loader2, ImageOff } from 'lucide-react';
import { toast } from 'sonner';
import { organizationsService } from '@/features/settings/services/organizations.service';

export default function SettingsGeneralPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', 'current'],
    queryFn: () => organizationsService.getCurrent(),
  });

  useEffect(() => {
    if (org) setName(org.name);
  }, [org]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['organization', 'current'] });

  const saveName = async () => {
    if (!name.trim()) return toast.error('O nome não pode ficar vazio');
    setSaving(true);
    try {
      await organizationsService.update({ name: name.trim() });
      toast.success('Empresa atualizada');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Envie uma imagem (PNG, JPG, WEBP…)');
    if (file.size > 5 * 1024 * 1024) return toast.error('Imagem muito grande (máx 5MB)');
    setUploading(true);
    try {
      await organizationsService.uploadLogo(file);
      toast.success('Logo atualizado');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar o logo');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeLogo = async () => {
    setUploading(true);
    try {
      await organizationsService.update({ logoUrl: null });
      toast.success('Logo removido');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao remover');
    } finally {
      setUploading(false);
    }
  };

  const input = 'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

  return (
    <div className="max-w-xl">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          <Building2 className="h-5 w-5" /> Geral
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500">Nome e logo da empresa. O logo aparece na pesquisa de satisfação enviada ao cliente.</p>
      </div>

      {isLoading ? (
        <p className="py-10 text-sm text-zinc-400">Carregando…</p>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Logo */}
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Logo da empresa</label>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                {org?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={org.logoUrl} alt="logo" className="h-full w-full object-contain" />
                ) : (
                  <ImageOff className="h-7 w-7 text-zinc-300 dark:text-zinc-600" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPickFile(e.target.files?.[0])} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {org?.logoUrl ? 'Trocar logo' : 'Enviar logo'}
                </button>
                {org?.logoUrl && (
                  <button onClick={removeLogo} disabled={uploading} className="text-left text-xs text-zinc-500 hover:text-red-500 disabled:opacity-50">
                    Remover logo
                  </button>
                )}
                <p className="text-[11px] text-zinc-400">PNG, JPG ou WEBP · até 5MB. Ideal: fundo transparente.</p>
              </div>
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Nome da empresa</label>
            <div className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
              <button onClick={saveName} disabled={saving} className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
