'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiCatalogService,
  type AiTool,
} from '../../services/ai-catalog.service';

interface Props {
  open: boolean;
  tool: AiTool | null;
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_PARAMS = `{
  "type": "object",
  "required": ["email"],
  "properties": {
    "email": {
      "type": "string",
      "description": "E-mail do cliente"
    }
  }
}`;

const DEFAULT_BODY = `{"email": "{{input.email}}"}`;
const DEFAULT_RESPONSE_MAP = `{"ok": "$.success", "message": "$.message"}`;

export function ToolDialog({ open, tool, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parameters, setParameters] = useState(DEFAULT_PARAMS);
  const [httpMethod, setHttpMethod] = useState('POST');
  const [httpUrl, setHttpUrl] = useState('');
  const [headersJson, setHeadersJson] = useState('{}');
  const [bodyTemplate, setBodyTemplate] = useState(DEFAULT_BODY);
  const [responseMap, setResponseMap] = useState(DEFAULT_RESPONSE_MAP);
  const [timeoutMs, setTimeoutMs] = useState(15000);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tool) {
      setName(tool.name);
      setDescription(tool.description);
      setParameters(JSON.stringify(tool.parameters, null, 2));
      setHttpMethod(tool.httpMethod ?? 'POST');
      setHttpUrl(tool.httpUrl ?? '');
      setHeadersJson(JSON.stringify(tool.httpHeaders ?? {}, null, 2));
      setBodyTemplate(tool.httpBodyTemplate ?? '');
      setResponseMap(
        tool.responseMap ? JSON.stringify(tool.responseMap, null, 2) : '',
      );
      setTimeoutMs(tool.timeoutMs);
    } else {
      setName('');
      setDescription('');
      setParameters(DEFAULT_PARAMS);
      setHttpMethod('POST');
      setHttpUrl('');
      setHeadersJson('{}');
      setBodyTemplate(DEFAULT_BODY);
      setResponseMap(DEFAULT_RESPONSE_MAP);
      setTimeoutMs(15000);
    }
  }, [tool, open]);

  if (!open) return null;

  const handleSave = async () => {
    let parsedParams: Record<string, unknown>;
    let parsedHeaders: Record<string, string> | undefined;
    let parsedResponseMap: Record<string, string> | undefined;
    try {
      parsedParams = JSON.parse(parameters);
    } catch {
      toast.error('Parameters: JSON inválido');
      return;
    }
    try {
      parsedHeaders = headersJson.trim() ? JSON.parse(headersJson) : {};
    } catch {
      toast.error('Headers: JSON inválido');
      return;
    }
    if (responseMap.trim()) {
      try {
        parsedResponseMap = JSON.parse(responseMap);
      } catch {
        toast.error('Response map: JSON inválido');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description,
        parameters: parsedParams,
        httpMethod,
        httpUrl,
        httpHeaders: parsedHeaders,
        httpBodyTemplate: bodyTemplate || undefined,
        responseMap: parsedResponseMap,
        timeoutMs,
        isActive: true,
      };
      if (tool) {
        await aiCatalogService.updateTool(tool.id, payload);
        toast.success('Tool atualizada');
      } else {
        await aiCatalogService.createTool(payload);
        toast.success('Tool criada');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {tool ? 'Editar tool' : 'Nova tool customizada (HTTP)'}
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
            <Field label="Nome (function name)" hint="só letras/dígitos/underscore — o LLM usa isso">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="unlockCourseAccess"
                className="font-mono"
              />
            </Field>
            <Field label="Timeout (ms)">
              <input
                type="number"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(parseInt(e.target.value, 10) || 15000)}
              />
            </Field>
          </div>

          <Field
            label="Descrição (pra LLM)"
            hint="Como o LLM decide se chama essa tool — escreva claro pro modelo entender quando usar"
          >
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Libera o acesso de um cliente a um curso da Bravy School. Use quando o cliente comprou e não recebeu acesso."
            />
          </Field>

          <Field label="Parameters (JSON Schema)" mono>
            <textarea
              rows={8}
              value={parameters}
              onChange={(e) => setParameters(e.target.value)}
              className="font-mono text-xs"
            />
          </Field>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              HTTP request
            </p>

            <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
              <Field label="Method">
                <select
                  value={httpMethod}
                  onChange={(e) => setHttpMethod(e.target.value)}
                >
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="URL" hint="Suporta {{input.x}}, {{ctx.x}}, {{env.X}}">
                <input
                  value={httpUrl}
                  onChange={(e) => setHttpUrl(e.target.value)}
                  placeholder="https://members.bravy.com.br/api/admin/grant-access"
                  className="font-mono text-xs"
                />
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Headers (JSON)" mono>
                <textarea
                  rows={3}
                  value={headersJson}
                  onChange={(e) => setHeadersJson(e.target.value)}
                  placeholder='{"Authorization": "Bearer {{env.MEMBERS_API_KEY}}"}'
                  className="font-mono text-xs"
                />
              </Field>
            </div>

            {httpMethod !== 'GET' && httpMethod !== 'DELETE' && (
              <div className="mt-3">
                <Field
                  label="Body template"
                  hint="String com substituições. Templates: {{input.x}}, {{ctx.x}}, {{env.X}}"
                  mono
                >
                  <textarea
                    rows={4}
                    value={bodyTemplate}
                    onChange={(e) => setBodyTemplate(e.target.value)}
                    placeholder='{"email": "{{input.email}}"}'
                    className="font-mono text-xs"
                  />
                </Field>
              </div>
            )}

            <div className="mt-3">
              <Field
                label="Response mapping (opcional)"
                hint='JSONPath simples: {"ok": "$.success", "message": "$.data.message"}. Vazio = retorna body cru.'
                mono
              >
                <textarea
                  rows={3}
                  value={responseMap}
                  onChange={(e) => setResponseMap(e.target.value)}
                  className="font-mono text-xs"
                />
              </Field>
            </div>
          </div>
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
            disabled={saving || !name || !description || !httpUrl}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : tool ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  mono,
  children,
}: {
  label: string;
  hint?: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <div
        className={`mt-1 [&>input]:w-full [&>input]:rounded-md [&>input]:border [&>input]:border-zinc-300 [&>input]:bg-white [&>input]:px-3 [&>input]:py-2 [&>input]:text-sm [&>select]:w-full [&>select]:rounded-md [&>select]:border [&>select]:border-zinc-300 [&>select]:bg-white [&>select]:px-3 [&>select]:py-2 [&>select]:text-sm [&>textarea]:w-full [&>textarea]:rounded-md [&>textarea]:border [&>textarea]:border-zinc-300 [&>textarea]:bg-white [&>textarea]:px-3 [&>textarea]:py-2 [&>textarea]:text-sm dark:[&>input]:border-zinc-700 dark:[&>input]:bg-zinc-800 dark:[&>input]:text-zinc-100 dark:[&>select]:border-zinc-700 dark:[&>select]:bg-zinc-800 dark:[&>select]:text-zinc-100 dark:[&>textarea]:border-zinc-700 dark:[&>textarea]:bg-zinc-800 dark:[&>textarea]:text-zinc-100 ${mono ? '' : ''}`}
      >
        {children}
      </div>
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}
