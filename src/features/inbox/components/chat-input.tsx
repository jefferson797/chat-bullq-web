'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Send, Paperclip, Mic, Trash2, Square, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useAudioRecorder } from '../hooks/use-audio-recorder';
import { quickRepliesService } from '@/features/quick-replies/services/quick-replies.service';
import { useOrgId } from '@/hooks/use-org-query-key';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  onSendAudio?: (blob: Blob) => Promise<void>;
  onSendFile?: (file: File) => Promise<void>;
  disabled?: boolean;
}

// Espelha o whitelist do backend (UploadsService.ALLOWED_MEDIA_MIME) — o
// accept é só UX; a validação real acontece no upload.
const FILE_ACCEPT = [
  'image/*',
  'video/*',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.zip',
].join(',');

export function ChatInput({ onSend, onSendAudio, onSendFile, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSendingAudio, setIsSendingAudio] = useState(false);
  const [isSendingFile, setIsSendingFile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorder = useAudioRecorder();

  // ─── Respostas rápidas (gatilho "/") ──────────────────────────────
  const orgId = useOrgId();
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);

  // só dispara a busca quando o texto é "/" + uma palavra (sem espaço/quebra)
  const slashQuery = useMemo(() => {
    const m = text.match(/^\/(\S*)$/);
    return m ? m[1].toLowerCase() : null;
  }, [text]);

  const { data: quickReplies = [] } = useQuery({
    queryKey: ['quick-replies', orgId],
    queryFn: () => quickRepliesService.list(),
    enabled: slashQuery !== null,
    staleTime: 60_000,
  });

  const slashMatches = useMemo(() => {
    if (slashQuery === null) return [];
    const q = slashQuery;
    return quickReplies
      .filter(
        (r) =>
          r.shortcut.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [quickReplies, slashQuery]);

  const slashOpen = slashQuery !== null && !slashDismissed && slashMatches.length > 0;

  useEffect(() => {
    setSlashIndex(0);
    setSlashDismissed(false);
  }, [slashQuery]);

  const applyQuickReply = useCallback((content: string) => {
    setText(content);
    setSlashDismissed(true);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 160) + 'px';
        el.setSelectionRange(content.length, content.length);
      }
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    try {
      await onSend(trimmed);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSending(false);
    }
  }, [text, isSending, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Menu de respostas rápidas aberto: setas navegam, Enter/Tab inserem.
    if (slashOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % slashMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + slashMatches.length) % slashMatches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyQuickReply(slashMatches[slashIndex].content);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashDismissed(true);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleSendAudio = useCallback(async () => {
    if (!recorder.blob || !onSendAudio) return;
    setIsSendingAudio(true);
    try {
      await onSendAudio(recorder.blob);
      recorder.reset();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Erro ao enviar áudio',
      );
    } finally {
      setIsSendingAudio(false);
    }
  }, [recorder, onSendAudio]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Limpa o value pra permitir reenviar o MESMO arquivo em seguida —
      // sem isso o onChange não dispara na segunda escolha.
      e.target.value = '';
      if (!file || !onSendFile) return;
      setIsSendingFile(true);
      try {
        await onSendFile(file);
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message || err?.message || 'Erro ao enviar arquivo',
        );
      } finally {
        setIsSendingFile(false);
      }
    },
    [onSendFile],
  );

  const formatElapsed = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (disabled) {
    return (
      <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50">
        Conversa encerrada — reabra para enviar mensagens
      </div>
    );
  }

  // RECORDING MODE: shows a big bar with a pulsing red dot and the timer.
  if (recorder.state === 'recording') {
    return (
      <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/40 dark:bg-red-500/10">
          <button
            onClick={recorder.cancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20"
            aria-label="Cancelar gravação"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="font-medium tabular-nums">{formatElapsed(recorder.elapsedMs)}</span>
            <span className="text-xs opacity-70">Gravando…</span>
          </div>
          <button
            onClick={recorder.stop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600"
            aria-label="Parar gravação"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // PREVIEW MODE: the recording finished, user can listen/discard/send.
  if (recorder.state === 'stopped' && recorder.blob) {
    const audioSrc = URL.createObjectURL(recorder.blob);
    return (
      <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900">
          <button
            onClick={recorder.cancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
            aria-label="Descartar áudio"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <audio
            controls
            src={audioSrc}
            className="h-9 flex-1 min-w-0"
          />
          <button
            onClick={handleSendAudio}
            disabled={isSendingAudio}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            aria-label="Enviar áudio"
          >
            {isSendingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </button>
        </div>
        {recorder.error && (
          <p className="mt-1 text-xs text-red-500">{recorder.error}</p>
        )}
      </div>
    );
  }

  // IDLE MODE: text input + mic button.
  const canRecord = !!onSendAudio;
  const showMic = canRecord && !text.trim();

  return (
    <div className="relative border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      {slashOpen && (
        <div className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center gap-1.5 border-b border-zinc-100 px-3 py-1.5 dark:border-zinc-800">
            <Zap className="h-3 w-3 text-primary" />
            <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              Respostas rápidas
            </span>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {slashMatches.map((qr, i) => (
              <button
                key={qr.id}
                type="button"
                onMouseEnter={() => setSlashIndex(i)}
                onClick={() => applyQuickReply(qr.content)}
                className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors ${
                  i === slashIndex
                    ? 'bg-primary/[0.06] dark:bg-primary/10'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-primary">
                    /{qr.shortcut}
                  </span>
                  <span className="truncate text-[13px] font-medium text-zinc-800 dark:text-zinc-200">
                    {qr.title}
                  </span>
                </div>
                <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {qr.content}
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-zinc-100 px-3 py-1 text-[10px] text-zinc-400 dark:border-zinc-800">
            ↑↓ navegar · Enter inserir · Esc fechar
          </div>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_ACCEPT}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!onSendFile || isSendingFile}
          className="mb-1 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800"
          aria-label="Anexar arquivo"
        >
          {isSendingFile ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Digite uma mensagem..."
          rows={1}
          className="max-h-40 min-h-[40px] flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {showMic ? (
          <button
            onClick={recorder.start}
            type="button"
            className="mb-1 rounded-lg bg-zinc-100 p-2.5 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="Gravar áudio"
          >
            <Mic className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isSending}
            className="mb-1 rounded-lg bg-primary p-2.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            aria-label="Enviar mensagem"
          >
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        )}
      </div>
      {recorder.error && (
        <p className="mt-1.5 text-xs text-red-500">{recorder.error}</p>
      )}
    </div>
  );
}
