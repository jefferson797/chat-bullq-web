'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, KanbanSquare } from 'lucide-react';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { KanbanBoard } from '@/features/pipelines/components/kanban-board';

export default function PipelineBoardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pipelineId = params?.id;

  const { data: board } = useQuery({
    queryKey: ['pipeline-board', pipelineId],
    queryFn: () => pipelinesService.getBoard(pipelineId!),
    enabled: !!pipelineId,
  });

  if (!pipelineId) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <button
          onClick={() => router.push('/pipelines')}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <KanbanSquare className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {board?.pipeline?.name ?? 'Pipeline'}
          </h1>
          {board?.pipeline?.description && (
            <p className="text-xs text-zinc-500">
              {board.pipeline.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden pt-3">
        <KanbanBoard pipelineId={pipelineId} />
      </div>
    </div>
  );
}
