'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bell,
  ArrowRightLeft,
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCheck,
} from 'lucide-react';
import {
  notificationsSettingsService,
  type Notification,
} from '@/features/settings/services/notifications.service';
import { getSocket } from '@/lib/socket';
import { playNotificationSound } from './notification-sound';
import { cn } from '@/lib/utils';

const NOTIFICATIONS_KEY = ['notifications'] as const;

/** Payload que o backend emite em `notification:new` (notification.processor). */
interface LiveNotification {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  createdAt?: string;
}

function iconForType(type: string) {
  switch (type) {
    case 'CONVERSATION_TRANSFERRED':
      return ArrowRightLeft;
    case 'NEW_MESSAGE':
    case 'CONVERSATION_ASSIGNED':
    case 'MENTION':
      return MessageSquare;
    case 'SLA_WARNING':
      return Clock;
    case 'SLA_BREACH':
    case 'AI_TOOL_FAILURE':
      return AlertTriangle;
    default:
      return Bell;
  }
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (Number.isNaN(then) || diff < 0) return 'agora';
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => notificationsSettingsService.list(1, 15),
    // Fallback caso um evento de socket seja perdido (deploy, aba dormindo).
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 15_000,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsSettingsService.markRead(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsSettingsService.markAllRead(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });

  // Tempo real: o backend emite `notification:new` pra sala user:<id>.
  // Ao chegar: atualiza o sino, toca o bip e mostra um toast clicável que
  // abre a conversa direto (deep-link /inbox?conversationId=...).
  useEffect(() => {
    const socket = getSocket();
    const onNew = (n: LiveNotification) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      playNotificationSound();
      const convId =
        typeof n?.data?.conversationId === 'string'
          ? (n.data.conversationId as string)
          : undefined;
      toast(n?.title ?? 'Nova notificação', {
        description: n?.body,
        duration: 9000,
        action: convId
          ? {
              label: 'Abrir',
              onClick: () => router.push(`/inbox?conversationId=${convId}`),
            }
          : undefined,
      });
    };
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, [queryClient, router]);

  const openNotification = (n: Notification, close: () => void) => {
    if (!n.isRead) markRead.mutate(n.id);
    const convId =
      typeof n.data?.conversationId === 'string'
        ? (n.data.conversationId as string)
        : undefined;
    close();
    if (convId) router.push(`/inbox?conversationId=${convId}`);
  };

  return (
    <Popover className="relative">
      <PopoverButton
        aria-label="Notificações"
        className={cn(
          'relative flex items-center justify-center rounded-lg p-1.5 text-zinc-500 transition-colors',
          'hover:text-zinc-950 focus:outline-none dark:text-zinc-400 dark:hover:text-white',
        )}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </PopoverButton>

      <PopoverPanel
        anchor="bottom start"
        transition
        className={cn(
          'z-50 mt-2 w-80 overflow-hidden rounded-xl border border-zinc-950/5 bg-white shadow-xl',
          'dark:border-white/10 dark:bg-zinc-900',
          'transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0',
          '[--anchor-gap:0.5rem]',
        )}
      >
        {({ close }) => (
          <div className="flex max-h-[70vh] flex-col">
            <div className="flex items-center justify-between border-b border-zinc-950/5 px-4 py-3 dark:border-white/10">
              <span className="text-sm font-semibold text-zinc-950 dark:text-white">
                Notificações
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                >
                  <CheckCheck className="size-3.5" />
                  Marcar todas
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                  <Bell className="size-6 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-sm text-zinc-400 dark:text-zinc-500">
                    Nenhuma notificação por aqui
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = iconForType(n.type);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openNotification(n, close)}
                      className={cn(
                        'flex w-full items-start gap-3 border-b border-zinc-950/5 px-4 py-3 text-left transition-colors last:border-b-0',
                        'hover:bg-zinc-950/[0.03] dark:border-white/5 dark:hover:bg-white/5',
                        !n.isRead && 'bg-blue-50/60 dark:bg-blue-500/5',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                          n.isRead
                            ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                            : 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'truncate text-sm',
                              n.isRead
                                ? 'font-medium text-zinc-700 dark:text-zinc-300'
                                : 'font-semibold text-zinc-950 dark:text-white',
                            )}
                          >
                            {n.title}
                          </span>
                          <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
                            {relativeTime(n.createdAt)}
                          </span>
                        </span>
                        {n.body && (
                          <span className="mt-0.5 line-clamp-2 block text-xs text-zinc-500 dark:text-zinc-400">
                            {n.body}
                          </span>
                        )}
                      </span>
                      {!n.isRead && (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </PopoverPanel>
    </Popover>
  );
}
