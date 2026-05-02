'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  Search,
  X,
  Clock,
  MessageCircle,
  Hourglass,
  CheckCircle2,
  SlidersHorizontal,
  Check,
  PanelLeftOpen,
  UserCheck,
  XCircle,
  RotateCcw,
  Loader2,
  ChevronDown,
  Inbox,
  Users,
  User,
} from 'lucide-react';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSidebarCollapse } from '@/components/ui/sidebar-layout';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react';
import { inboxService, type Conversation } from '../services/inbox.service';
import { inboxViewsService } from '@/features/inbox-views/services/inbox-views.service';
import { channelsService } from '@/features/channels/services/channels.service';
import { ZappfyIcon, MetaIcon, InstagramIcon } from '@/components/ui/icons';
import { useOrgId } from '@/hooks/use-org-query-key';
import { useSocket } from '../hooks/use-socket';
import { useAuthStore } from '@/stores/auth-store';
import { useInboxPreferences } from '../hooks/use-inbox-preferences';
import { ConversationContextMenu } from './conversation-context-menu';

function ListAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = name?.slice(0, 2).toUpperCase() || '??';
  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'avatar'}
        onError={() => setFailed(true)}
        className="h-10 w-10 rounded-full bg-zinc-100 object-cover dark:bg-zinc-800"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-[13px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      {initials}
    </div>
  );
}

type ScopeFilter = 'ALL' | 'MINE';

const scopeOptions: { label: string; value: ScopeFilter; icon: React.ElementType }[] = [
  { label: 'Todas as conversas', value: 'ALL', icon: Users },
  { label: 'Minhas conversas', value: 'MINE', icon: User },
];

const channelIcons: Record<string, React.ElementType> = {
  WHATSAPP_ZAPPFY: ZappfyIcon,
  WHATSAPP_OFFICIAL: MetaIcon,
  INSTAGRAM: InstagramIcon,
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-400',
  OPEN: 'bg-emerald-400',
  BOT: 'bg-blue-400',
  WAITING: 'bg-violet-400',
  CLOSED: 'bg-zinc-300 dark:bg-zinc-600',
};

const statusOptions = [
  { label: 'Pendentes', value: 'PENDING', icon: Clock },
  { label: 'Abertos', value: 'OPEN', icon: MessageCircle },
  { label: 'Aguardando', value: 'WAITING', icon: Hourglass },
  { label: 'Fechados', value: 'CLOSED', icon: CheckCircle2 },
] as const;

interface ConversationListProps {
  activeId: string | null;
  onSelect: (conversation: Conversation) => void;
  /**
   * When set, fetches conversations through the inbox view endpoint
   * (`/inbox-views/:id/conversations`) which applies the view's saved
   * filters server-side. The user's local filters (status/channel/scope)
   * still layer on top via query params.
   */
  viewId?: string | null;
}

export function ConversationList({ activeId, onSelect, viewId }: ConversationListProps) {
  const sidebarCtx = useSidebarCollapse();
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const { on } = useSocket();
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const {
    preferences: savedPrefs,
    isLoaded: prefsLoaded,
    update: updatePrefs,
  } = useInboxPreferences();
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [scope, setScope] = useState<ScopeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const hydratedRef = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    conversation: Conversation;
    position: { x: number; y: number };
  } | null>(null);

  // Hydrate state from saved preferences once they load
  useEffect(() => {
    if (!prefsLoaded || hydratedRef.current) return;
    hydratedRef.current = true;
    if (savedPrefs.scope === 'MINE' || savedPrefs.scope === 'ALL') {
      setScope(savedPrefs.scope);
    }
    if (Array.isArray(savedPrefs.statusFilters)) {
      setStatusFilters(new Set(savedPrefs.statusFilters));
    }
    if (savedPrefs.selectedChannelId !== undefined) {
      setSelectedChannelId(savedPrefs.selectedChannelId ?? null);
    }
  }, [prefsLoaded, savedPrefs]);

  const toggleStatus = useCallback(
    (value: string) => {
      setStatusFilters((prev) => {
        const next = new Set(prev);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        updatePrefs({ statusFilters: Array.from(next) });
        return next;
      });
    },
    [updatePrefs],
  );

  const clearStatusFilters = useCallback(() => {
    setStatusFilters(new Set());
    updatePrefs({ statusFilters: [] });
  }, [updatePrefs]);

  const handleScopeChange = useCallback(
    (next: ScopeFilter) => {
      setScope(next);
      updatePrefs({ scope: next });
    },
    [updatePrefs],
  );

  const handleChannelChange = useCallback(
    (next: string | null) => {
      setSelectedChannelId(next);
      updatePrefs({ selectedChannelId: next });
    },
    [updatePrefs],
  );

  const statusFilterKey = Array.from(statusFilters).sort().join(',');

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  useEffect(() => {
    return () => clearTimeout(debounceTimer.current);
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data: channels = [] } = useQuery({
    queryKey: ['channels', orgId],
    queryFn: () => channelsService.list(),
  });

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId) ?? null,
    [channels, selectedChannelId],
  );

  // Reset scroll when filters/search change
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [statusFilterKey, debouncedSearch, selectedChannelId, scope]);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['conversations', orgId, viewId ?? null, statusFilterKey, debouncedSearch, selectedChannelId, scope, currentUserId],
    queryFn: ({ pageParam = 1 }) => {
      const params: Record<string, string> = { limit: '30', page: String(pageParam) };
      if (statusFilters.size > 0) params.status = Array.from(statusFilters).join(',');
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedChannelId) params.channelId = selectedChannelId;
      if (scope === 'MINE' && currentUserId) params.assignedToId = currentUserId;
      if (viewId) {
        return inboxViewsService.getConversations(viewId, params);
      }
      return inboxService.getConversations(params);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    // Realtime (message:new / conversation:updated) drives updates — keep a
    // slow safety-net poll to cover transient socket drops.
    refetchInterval: 60000,
    staleTime: 15000,
  });

  const conversations = useMemo(
    () => data?.pages.flatMap((p) => p.conversations) || [],
    [data],
  );

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: scrollContainerRef.current, rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, []);

  const handleConversationClick = useCallback(
    (conv: Conversation, index: number, e: React.MouseEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (lastClickedIndex !== null && conversations.length > 0) {
            const start = Math.min(lastClickedIndex, index);
            const end = Math.max(lastClickedIndex, index);
            for (let i = start; i <= end; i++) {
              next.add(conversations[i].id);
            }
          } else {
            next.add(conv.id);
          }
          return next;
        });
        setLastClickedIndex(index);
        return;
      }

      if (selectedIds.size > 0) {
        clearSelection();
      }
      onSelect(conv);
      setLastClickedIndex(index);
    },
    [lastClickedIndex, conversations, selectedIds.size, clearSelection, onSelect],
  );

  const toggleSelect = useCallback((id: string, index: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLastClickedIndex(index);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(conversations.map((c) => c.id)));
  }, [conversations]);

  const invalidateConversations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, [queryClient]);

  // Realtime: refresh list on inbound messages, imported conversations, or
  // state transitions (assign/close/reopen/transfer).
  useEffect(() => {
    const unsubNew = on('message:new', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    const unsubImported = on('conversation:imported', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    const unsubUpdated = on('conversation:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return () => {
      unsubNew?.();
      unsubImported?.();
      unsubUpdated?.();
    };
  }, [on, queryClient]);

  const handleBulkAction = useCallback(
    async (action: 'close' | 'assign' | 'reopen') => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      setBulkLoading(true);
      try {
        if (action === 'close') await inboxService.bulkClose(ids);
        else if (action === 'assign') await inboxService.bulkAssignToMe(ids);
        else if (action === 'reopen') await inboxService.bulkReopen(ids);
        clearSelection();
        invalidateConversations();
      } finally {
        setBulkLoading(false);
      }
    },
    [selectedIds, clearSelection, invalidateConversations],
  );

  const getLastMessagePreview = (conv: Conversation) => {
    const last = conv.messages[0];
    if (!last) return 'Sem mensagens';
    const prefix = last.direction === 'OUTBOUND' ? 'Você: ' : '';
    const rt = (last as any).metadata?.replyTo;
    const storyPrefix = rt?.story
      ? rt.story.kind === 'mention'
        ? '📸 Mencionou no story · '
        : '📸 Respondeu seu story · '
      : rt?.ad
        ? '📢 Respondeu ao anúncio · '
        : '';
    return prefix + storyPrefix + (last.content?.text || `[${last.type}]`);
  };

  const formatTime = (date: string | null) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = diffMs / (1000 * 60 * 60);
    if (diffH < 24) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex h-full w-80 flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Scope selector (All / Mine) */}
      <div className="px-3 pt-3">
        <Popover className="relative">
          <PopoverButton className="flex w-full items-center gap-2 rounded-md border border-zinc-200/80 bg-white px-2.5 py-1.5 text-left text-[13px] text-zinc-700 outline-none transition-colors hover:bg-zinc-50 data-[open]:border-primary/40 data-[open]:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:data-[open]:bg-zinc-900">
            {(() => {
              const current = scopeOptions.find((o) => o.value === scope) ?? scopeOptions[0];
              const Icon = current.icon;
              return <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />;
            })()}
            <span className="flex-1 truncate font-medium">
              {scopeOptions.find((o) => o.value === scope)?.label ?? 'Todas as conversas'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          </PopoverButton>
          <PopoverPanel
            anchor="bottom start"
            transition
            className="z-50 mt-1.5 w-[var(--button-width)] rounded-lg border border-zinc-200/80 bg-white p-1 shadow-lg outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:border-zinc-800 dark:bg-zinc-900 [--anchor-gap:0.25rem]"
          >
            {({ close }) => (
              <>
                {scopeOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = scope === option.value;
                  const disabled = option.value === 'MINE' && !currentUserId;
                  return (
                    <button
                      key={option.value}
                      onClick={() => { if (!disabled) { handleScopeChange(option.value); close(); } }}
                      disabled={disabled}
                      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        isActive
                          ? 'bg-primary/[0.06] font-medium text-primary dark:bg-primary/10'
                          : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1">{option.label}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </>
            )}
          </PopoverPanel>
        </Popover>
      </div>

      {/* Channel selector */}
      <div className="px-3 pt-2">
        <Popover className="relative">
          <PopoverButton className="flex w-full items-center gap-2 rounded-md border border-zinc-200/80 bg-white px-2.5 py-1.5 text-left text-[13px] text-zinc-700 outline-none transition-colors hover:bg-zinc-50 data-[open]:border-primary/40 data-[open]:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:data-[open]:bg-zinc-900">
            {(() => {
              const Icon = selectedChannel
                ? channelIcons[selectedChannel.type] || MessageSquare
                : Inbox;
              return <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />;
            })()}
            <span className="flex-1 truncate font-medium">
              {selectedChannel ? selectedChannel.name : 'Todos os canais'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          </PopoverButton>
          <PopoverPanel
            anchor="bottom start"
            transition
            className="z-50 mt-1.5 w-[var(--button-width)] rounded-lg border border-zinc-200/80 bg-white p-1 shadow-lg outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:border-zinc-800 dark:bg-zinc-900 [--anchor-gap:0.25rem]"
          >
            {({ close }) => (
              <>
                <button
                  onClick={() => { handleChannelChange(null); close(); }}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                    selectedChannelId === null
                      ? 'bg-primary/[0.06] font-medium text-primary dark:bg-primary/10'
                      : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Inbox className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">Todos os canais</span>
                  {selectedChannelId === null && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
                {channels.length > 0 && (
                  <div className="mx-2 my-1 border-t border-zinc-100 dark:border-zinc-800" />
                )}
                {channels.map((channel) => {
                  const Icon = channelIcons[channel.type] || MessageSquare;
                  const isActive = selectedChannelId === channel.id;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => { handleChannelChange(channel.id); close(); }}
                      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                        isActive
                          ? 'bg-primary/[0.06] font-medium text-primary dark:bg-primary/10'
                          : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{channel.name}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </>
            )}
          </PopoverPanel>
        </Popover>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-1.5 px-3 pt-2 pb-2">
        {sidebarCtx?.collapsed && (
          <button
            type="button"
            onClick={sidebarCtx.toggle}
            aria-label="Expandir menu"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        )}
        <div className="group relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border-0 bg-zinc-100/80 py-1.5 pl-8 pr-8 text-[13px] text-zinc-900 outline-none ring-1 ring-transparent transition-all placeholder:text-zinc-400 focus:bg-white focus:ring-primary/30 focus:shadow-sm dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900 dark:focus:ring-primary/30"
          />
          {search && (
            <button
              onClick={() => { handleSearchChange(''); searchRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <Popover className="relative">
          <PopoverButton className={`relative flex h-[30px] w-[30px] items-center justify-center rounded-md transition-colors outline-none data-[open]:bg-zinc-100 data-[open]:text-zinc-600 dark:data-[open]:bg-zinc-800 dark:data-[open]:text-zinc-300 ${
            statusFilters.size > 0
              ? 'bg-primary/10 text-primary dark:bg-primary/20 data-[open]:bg-primary/10 data-[open]:text-primary dark:data-[open]:bg-primary/20 dark:data-[open]:text-primary'
              : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300'
          }`}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {statusFilters.size > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                {statusFilters.size}
              </span>
            )}
          </PopoverButton>

          <PopoverPanel
            anchor="bottom end"
            transition
            className="z-50 mt-1.5 w-48 rounded-lg border border-zinc-200/80 bg-white p-1 shadow-lg outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:border-zinc-800 dark:bg-zinc-900 [--anchor-gap:0.25rem]"
          >
            <div>
              <p className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Status
              </p>
              {statusOptions.map((f) => {
                const isActive = statusFilters.has(f.value);
                const Icon = f.icon;
                return (
                  <button
                    key={f.value}
                    onClick={() => toggleStatus(f.value)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                      isActive
                        ? 'bg-primary/[0.06] font-medium text-primary dark:bg-primary/10'
                        : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isActive
                        ? 'border-primary bg-primary text-white'
                        : 'border-zinc-300 dark:border-zinc-600'
                    }`}>
                      {isActive && <Check className="h-2.5 w-2.5" />}
                    </div>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1">{f.label}</span>
                  </button>
                );
              })}
              {statusFilters.size > 0 && (
                <>
                  <div className="mx-2 my-1 border-t border-zinc-100 dark:border-zinc-800" />
                  <button
                    onClick={clearStatusFilters}
                    className="flex w-full items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-300"
                  >
                    <X className="h-3 w-3" />
                    Limpar filtros
                  </button>
                </>
              )}
            </div>
          </PopoverPanel>
        </Popover>
      </div>

      {/* Active filter chips */}
      {statusFilters.size > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {Array.from(statusFilters).map((value) => {
            const option = statusOptions.find((f) => f.value === value);
            if (!option) return null;
            return (
              <span
                key={value}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary dark:bg-primary/20"
              >
                {option.label}
                <button
                  onClick={() => toggleStatus(value)}
                  className="rounded-full p-0.5 transition-colors hover:bg-primary/20 dark:hover:bg-primary/30"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
          {statusFilters.size > 1 && (
            <button
              onClick={clearStatusFilters}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <X className="h-2.5 w-2.5" />
              Limpar
            </button>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-1.5 border-t border-b border-zinc-200/80 bg-primary/4 px-3 py-1.5 dark:border-zinc-800 dark:bg-primary/10">
          <button
            onClick={clearSelection}
            className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <span className="text-[12px] font-medium text-zinc-600 dark:text-zinc-300">
            {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={selectAll}
            className="text-[11px] text-primary hover:underline"
          >
            Todas
          </button>
          <div className="flex-1" />
          <button
            onClick={() => handleBulkAction('assign')}
            disabled={bulkLoading}
            title="Assumir"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
          >
            <UserCheck className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleBulkAction('close')}
            disabled={bulkLoading}
            title="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleBulkAction('reopen')}
            disabled={bulkLoading}
            title="Reabrir"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-emerald-50 hover:text-emerald-500 disabled:opacity-50 dark:hover:bg-emerald-500/10"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Divider */}
      {selectedIds.size === 0 && (
        <div className="mx-3 border-t border-zinc-100 dark:border-zinc-800/60" />
      )}

      {/* Conversation list */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-3 py-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
              <div className="flex-1 space-y-2 pt-0.5">
                <div className="h-3.5 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-3 w-36 animate-pulse rounded bg-zinc-50 dark:bg-zinc-800/60" />
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <MessageSquare className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
            </div>
            <p className="mt-3 text-[13px] font-medium text-zinc-400 dark:text-zinc-500">
              Nenhuma conversa encontrada
            </p>
            {(statusFilters.size > 0 || search) && (
              <button
                onClick={() => { clearStatusFilters(); handleSearchChange(''); }}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {conversations.map((conv, index) => {
              const isActive = conv.id === activeId;
              const isSelected = selectedIds.has(conv.id);
              const inSelectionMode = selectedIds.size > 0;
              return (
                <button
                  key={conv.id}
                  onClick={(e) => handleConversationClick(conv, index, e)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      conversation: conv,
                      position: { x: e.clientX, y: e.clientY },
                    });
                  }}
                  className={`group flex w-full gap-3 px-3 py-2.5 text-left transition-colors duration-100 ${
                    isSelected
                      ? 'bg-primary/[0.06] dark:bg-primary/10'
                      : isActive
                        ? 'bg-primary/[0.06] dark:bg-primary/10'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="relative shrink-0">
                    {inSelectionMode ? (
                      <div
                        role="checkbox"
                        aria-checked={isSelected}
                        onClick={(e) => { e.stopPropagation(); toggleSelect(conv.id, index); }}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary text-white'
                            : 'border-zinc-300 bg-zinc-100 text-transparent hover:border-primary/50 dark:border-zinc-600 dark:bg-zinc-800'
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </div>
                    ) : (
                      <ListAvatar
                        name={conv.contact.name}
                        avatarUrl={conv.contact.avatarUrl}
                      />
                    )}
                    {(() => {
                      const ChannelIcon = channelIcons[conv.channel.type] || MessageSquare;
                      return (
                        <div className="absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-white bg-white dark:border-zinc-950 dark:bg-zinc-900">
                          <ChannelIcon className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                        </div>
                      );
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`truncate text-[13px] font-medium ${isActive || isSelected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-800 dark:text-zinc-200'}`}>
                          {conv.contact.name || conv.contact.phone || 'Desconhecido'}
                        </span>
                        <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusColors[conv.status] || 'bg-zinc-300'}`} />
                      </div>
                      <span className="shrink-0 text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
                        {formatTime(conv.messages[0]?.createdAt ?? conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <p className="truncate text-[12px] text-zinc-500 dark:text-zinc-400">
                        {getLastMessagePreview(conv)}
                      </p>
                    </div>
                    {(conv.tags?.length || conv.contact.tags?.length) ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {conv.tags?.map((t) => (
                          <span
                            key={`c-${t.tag.id}`}
                            title={`Tag na conversa: ${t.tag.name}`}
                            className="inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-medium"
                            style={{
                              backgroundColor: `${t.tag.color}1f`,
                              color: t.tag.color,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: t.tag.color }}
                            />
                            {t.tag.name}
                          </span>
                        ))}
                        {conv.contact.tags?.map((t) => (
                          <span
                            key={`ct-${t.tag.id}`}
                            title={`Tag no contato: ${t.tag.name}`}
                            className="inline-flex items-center gap-1 rounded-full border border-dashed px-1.5 py-px text-[10px] font-medium"
                            style={{
                              borderColor: `${t.tag.color}80`,
                              color: t.tag.color,
                            }}
                          >
                            {t.tag.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              </div>
            )}
          </>
        )}
      </div>

      {contextMenu && (
        <ConversationContextMenu
          conversation={contextMenu.conversation}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
