'use client';

import { useEffect, useState } from 'react';
import { X, Globe, Database, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiCatalogService,
  type AiTool,
} from '../../services/ai-catalog.service';

type Source = 'CUSTOM_HTTP' | 'CUSTOM_SQL';

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

interface ParamRow { name: string; source: string; }

export function ToolDialog({ open, tool, onClose, onSaved }: Props) {
  const [source, setSource] = useState<Source>('CUSTOM_HTTP');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parameters, setParameters] = useState(DEFAULT_PARAMS);
  const [timeoutMs, setTimeoutMs] = useState(15000);
  const [saving, setSaving] = useState(false);

  // HTTP
  const [httpMethod, setHttpMethod] = useState('POST');
  const [httpUrl, setHttpUrl] = useState('');
  const [headersJson, setHeadersJson] = useState('{}');
  const [bodyTemplate, setBodyTemplate] = useState('{"email": "{{input.email}}"}');
  const [responseMap, setResponseMap] = useState('{"ok": "$.success", "message": "$.message"}');

  // SQL
  const [sqlConnectionRef, setSqlConnectionRef] = useState('');
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users WHERE email = $1 LIMIT 1');
  const [sqlParams, setSqlParams] = useState<ParamRow[]>([{ name: 'email', source: 'input.email' }]);
  const [sqlReadOnly, setSqlReadOnly] = useState(true);
  const [sqlMaxRows, setSqlMaxRows] = useState(50);

  useEffect(() => {
    if (tool) {
      setSource(tool.source as Source);
      setName(tool.name);
      setDescription(tool.description);
      setParameters(JSON.stringify(tool.parameters, null, 2));
      setTimeoutMs(tool.timeoutMs);
      setHttpMethod(tool.httpMethod ?? 'POST');
      setHttpUrl(tool.httpUrl ?? '');
      setHeadersJson(JSON.stringify(tool.httpHeaders ?? {}, null, 2));
      setBodyTemplate(tool.httpBodyTemplate ?? '');
      setResponseMap(tool.responseMap ? JSON.stringify(tool.responseMap, null, 2) : '');
      setSqlConnectionRef(tool.sqlConnectionRef ?? '');
      setSqlQuery(tool.sqlQuery ?? '');
      setSqlParams(
        Array.isArray(tool.sqlParamMap) && tool.sqlParamMap.length > 0
          ? tool.sqlParamMap.map((p) => ({ name: p.name ?? '', source: p.source }))
          : [],
      );
      setSqlReadOnly(tool.sqlReadOnly);
      setSqlMaxRows(tool.sqlMaxRows);
    } else {
      setSource('CUSTOM_HTTP');
      setName('');
      setDescription('');
      setParameters(DEFAULT_PARAMS);
      setTimeoutMs(15000);
      setHttpMethod('POST');
      setHttpUrl('');
      setHeadersJson('{}');
      setBodyTemplate('{"email": "{{input.email}}"}');
      setResponseMap('{"ok": "$.success", "message": "$.message"}');
      setSqlConnectionRef('');
      setSqlQuery('SELECT * FROM users WHERE email = $1 LIMIT 1');
      setSqlParams([{ name: 'email', source: 'input.email' }]);
      setSqlReadOnly(true);
      setSqlMaxRows(50);
    }
  }, [tool, open]);

  if (!open) return null;

  const handleSave = async () => {
    let parsedParams: Record<string, unknown>;
    try {
      parsedParams = JSON.parse(parameters);
    } catch {
      toast.error('Parameters: JSON inválido');
      return;
    }

    const payload: any = {
      name,
      description,
      parameters: parsedParams,
      source,
      timeoutMs,
      isActive: true,
    };

    if (source === 'CUSTOM_HTTP') {
      let parsedHeaders: Record<string, string>;
      let parsedResponseMap: Record<string, string> | undefined;
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
      Object.assign(payload, {
        httpMethod,
        httpUrl,
        httpHeaders: parsedHeaders,
        httpBodyTemplate: bodyTemplate || undefined,
        responseMap: parsedResponseMap,
      });
    } else {
      Object.assign(payload, {
        sqlConnectionRef,
        sqlQuery,
        sqlParamMap: sqlParams.filter((p) => p.source.trim()),
        sqlReadOnly,
        sqlMaxRows,
      });
    }

    setSaving(true);
    try {
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
            {tool ? 'Editar tool' : 'Nova tool customizada'}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Source switcher */}
          {!tool && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSource('CUSTOM_HTTP')}
                className={`flex items-center gap-2 rounded-lg border-2 p-3 text-left transition-colors ${
                  source === 'CUSTOM_HTTP'
                    ? 'border-primary bg-primary/5'
                    : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                }`}
              >
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">HTTP</p>
                  <p className="text-[11px] text-zinc-500">Chama uma API externa</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSource('CUSTOM_SQL')}
                className={`flex items-center gap-2 rounded-lg border-2 p-3 text-left transition-colors ${
                  source === 'CUSTOM_SQL'
                    ? 'border-primary bg-primary/5'
                    : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                }`}
              >
                <Database className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">SQL (Postgres)</p>
                  <p className="text-[11px] text-zinc-500">Query num banco externo</p>
                </div>
              </button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome (function name)" hint="só letras/dígitos/underscore">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={source === 'CUSTOM_SQL' ? 'checkPurchase' : 'unlockCourseAccess'}
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
            hint="Como o LLM decide quando chamar essa tool"
          >
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                source === 'CUSTOM_SQL'
                  ? 'Verifica se um cliente comprou determinado produto na base do funil. Use antes de liberar acesso.'
                  : 'Libera o acesso de um cliente a um curso da Bravy School. Use quando o cliente comprou e não recebeu acesso.'
              }
            />
          </Field>

          <Field label="Parameters (JSON Schema)" mono>
            <textarea
              rows={6}
              value={parameters}
              onChange={(e) => setParameters(e.target.value)}
              className="font-mono text-xs"
            />
          </Field>

          {source === 'CUSTOM_HTTP' ? (
            <HttpSection
              httpMethod={httpMethod}
              setHttpMethod={setHttpMethod}
              httpUrl={httpUrl}
              setHttpUrl={setHttpUrl}
              headersJson={headersJson}
              setHeadersJson={setHeadersJson}
              bodyTemplate={bodyTemplate}
              setBodyTemplate={setBodyTemplate}
              responseMap={responseMap}
              setResponseMap={setResponseMap}
            />
          ) : (
            <SqlSection
              sqlConnectionRef={sqlConnectionRef}
              setSqlConnectionRef={setSqlConnectionRef}
              sqlQuery={sqlQuery}
              setSqlQuery={setSqlQuery}
              sqlParams={sqlParams}
              setSqlParams={setSqlParams}
              sqlReadOnly={sqlReadOnly}
              setSqlReadOnly={setSqlReadOnly}
              sqlMaxRows={sqlMaxRows}
              setSqlMaxRows={setSqlMaxRows}
            />
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
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : tool ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HttpSection(props: any) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        HTTP request
      </p>
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <Field label="Method">
          <select value={props.httpMethod} onChange={(e) => props.setHttpMethod(e.target.value)}>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="URL" hint="Suporta {{input.x}}, {{ctx.x}}, {{env.X}}">
          <input
            value={props.httpUrl}
            onChange={(e) => props.setHttpUrl(e.target.value)}
            placeholder="https://members.bravy.com.br/api/admin/grant-access"
            className="font-mono text-xs"
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Headers (JSON)" mono>
          <textarea
            rows={3}
            value={props.headersJson}
            onChange={(e) => props.setHeadersJson(e.target.value)}
            placeholder='{"Authorization": "Bearer {{env.MEMBERS_API_KEY}}"}'
            className="font-mono text-xs"
          />
        </Field>
      </div>
      {props.httpMethod !== 'GET' && props.httpMethod !== 'DELETE' && (
        <div className="mt-3">
          <Field label="Body template" hint="String com substituições" mono>
            <textarea
              rows={4}
              value={props.bodyTemplate}
              onChange={(e) => props.setBodyTemplate(e.target.value)}
              className="font-mono text-xs"
            />
          </Field>
        </div>
      )}
      <div className="mt-3">
        <Field label="Response mapping (opcional)" hint="JSONPath simples" mono>
          <textarea
            rows={3}
            value={props.responseMap}
            onChange={(e) => props.setResponseMap(e.target.value)}
            className="font-mono text-xs"
          />
        </Field>
      </div>
    </div>
  );
}

function SqlSection(props: any) {
  const addParam = () =>
    props.setSqlParams([...props.sqlParams, { name: '', source: '' }]);
  const updateParam = (i: number, patch: Partial<ParamRow>) =>
    props.setSqlParams(
      props.sqlParams.map((p: ParamRow, idx: number) =>
        idx === i ? { ...p, ...patch } : p,
      ),
    );
  const removeParam = (i: number) =>
    props.setSqlParams(
      props.sqlParams.filter((_: ParamRow, idx: number) => idx !== i),
    );

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        SQL query (Postgres)
      </p>

      <Field
        label="Connection ref (env var)"
        hint="Nome da env var no servidor com a connection string. Ex: HOTWEBINAR_DB_URL"
      >
        <input
          value={props.sqlConnectionRef}
          onChange={(e) => props.setSqlConnectionRef(e.target.value)}
          placeholder="HOTWEBINAR_DB_URL"
          className="font-mono"
        />
      </Field>

      <div className="mt-3">
        <Field
          label="Query"
          hint="Use $1, $2, ... pra parâmetros. NUNCA concatene valores na string."
          mono
        >
          <textarea
            rows={5}
            value={props.sqlQuery}
            onChange={(e) => props.setSqlQuery(e.target.value)}
            className="font-mono text-xs"
          />
        </Field>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Parâmetros (em ordem — $1, $2…)
          </label>
          <button
            type="button"
            onClick={addParam}
            className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            <Plus className="h-3 w-3" /> Adicionar
          </button>
        </div>
        <div className="mt-1 space-y-1.5">
          {props.sqlParams.map((p: ParamRow, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-8 text-center font-mono text-xs text-zinc-500">
                ${i + 1}
              </span>
              <input
                value={p.name}
                onChange={(e) => updateParam(i, { name: e.target.value })}
                placeholder="nome (ref)"
                className="w-32 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <input
                value={p.source}
                onChange={(e) => updateParam(i, { source: e.target.value })}
                placeholder="input.email | ctx.contactId | literal:foo"
                className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={() => removeParam(i)}
                className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Max rows">
          <input
            type="number"
            value={props.sqlMaxRows}
            onChange={(e) => props.setSqlMaxRows(parseInt(e.target.value, 10) || 50)}
          />
        </Field>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={props.sqlReadOnly}
              onChange={(e) => props.setSqlReadOnly(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-zinc-700 dark:text-zinc-300">
              Read-only (recomendado — bloqueia INSERT/UPDATE/DELETE)
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
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
      <div className="mt-1 [&>input]:w-full [&>input]:rounded-md [&>input]:border [&>input]:border-zinc-300 [&>input]:bg-white [&>input]:px-3 [&>input]:py-2 [&>input]:text-sm [&>select]:w-full [&>select]:rounded-md [&>select]:border [&>select]:border-zinc-300 [&>select]:bg-white [&>select]:px-3 [&>select]:py-2 [&>select]:text-sm [&>textarea]:w-full [&>textarea]:rounded-md [&>textarea]:border [&>textarea]:border-zinc-300 [&>textarea]:bg-white [&>textarea]:px-3 [&>textarea]:py-2 [&>textarea]:text-sm dark:[&>input]:border-zinc-700 dark:[&>input]:bg-zinc-800 dark:[&>input]:text-zinc-100 dark:[&>select]:border-zinc-700 dark:[&>select]:bg-zinc-800 dark:[&>select]:text-zinc-100 dark:[&>textarea]:border-zinc-700 dark:[&>textarea]:bg-zinc-800 dark:[&>textarea]:text-zinc-100">
        {children}
      </div>
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}
