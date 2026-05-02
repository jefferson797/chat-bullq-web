import { api } from '@/lib/api';

export type ToolSource = 'BUILTIN' | 'CUSTOM_HTTP' | 'CUSTOM_SQL';

export interface AiTool {
  id: string;
  organizationId: string | null;
  name: string;
  description: string;
  source: ToolSource;
  parameters: Record<string, unknown>;
  httpMethod: string | null;
  httpUrl: string | null;
  httpHeaders: Record<string, string> | null;
  httpBodyTemplate: string | null;
  responseMap: Record<string, string> | null;
  sqlConnectionRef: string | null;
  sqlQuery: string | null;
  sqlParamMap: Array<{ name?: string; source: string }> | null;
  sqlReadOnly: boolean;
  sqlMaxRows: number;
  timeoutMs: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCustomToolInput {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  source: 'CUSTOM_HTTP' | 'CUSTOM_SQL';
  httpMethod?: string;
  httpUrl?: string;
  httpHeaders?: Record<string, string>;
  httpBodyTemplate?: string;
  responseMap?: Record<string, string>;
  sqlConnectionRef?: string;
  sqlQuery?: string;
  sqlParamMap?: Array<{ name?: string; source: string }>;
  sqlReadOnly?: boolean;
  sqlMaxRows?: number;
  timeoutMs?: number;
  isActive?: boolean;
}

export interface AiSkill {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  category: string | null;
  promptInstructions: string | null;
  currentVersion: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tools: Array<{ tool: AiTool }>;
  agents?: Array<{ agent: { id: string; name: string } }>;
  _count?: { agents: number; versions: number };
}

export interface AiSkillVersion {
  id: string;
  skillId: string;
  version: number;
  name: string;
  description: string;
  category: string | null;
  promptInstructions: string | null;
  toolIds: string[];
  changedById: string | null;
  changeNote: string | null;
  createdAt: string;
}

export interface UpsertSkillInput {
  name: string;
  description: string;
  category?: string;
  promptInstructions?: string;
  toolIds: string[];
  isActive?: boolean;
  changeNote?: string;
}

export const aiCatalogService = {
  // ── Tools ──────────────────────────────────────────────────────
  async listTools(): Promise<AiTool[]> {
    const { data } = await api.get('/ai-catalog/tools');
    return data.data ?? data;
  },
  async findTool(id: string): Promise<AiTool> {
    const { data } = await api.get(`/ai-catalog/tools/${id}`);
    return data.data ?? data;
  },
  async createTool(input: UpsertCustomToolInput): Promise<AiTool> {
    const { data } = await api.post('/ai-catalog/tools', input);
    return data.data ?? data;
  },
  async updateTool(id: string, input: UpsertCustomToolInput): Promise<AiTool> {
    const { data } = await api.patch(`/ai-catalog/tools/${id}`, input);
    return data.data ?? data;
  },
  async removeTool(id: string): Promise<void> {
    await api.delete(`/ai-catalog/tools/${id}`);
  },

  // ── Skills ─────────────────────────────────────────────────────
  async listSkills(): Promise<AiSkill[]> {
    const { data } = await api.get('/ai-catalog/skills');
    return data.data ?? data;
  },
  async findSkill(id: string): Promise<AiSkill> {
    const { data } = await api.get(`/ai-catalog/skills/${id}`);
    return data.data ?? data;
  },
  async listSkillVersions(id: string): Promise<AiSkillVersion[]> {
    const { data } = await api.get(`/ai-catalog/skills/${id}/versions`);
    return data.data ?? data;
  },
  async createSkill(input: UpsertSkillInput): Promise<AiSkill> {
    const { data } = await api.post('/ai-catalog/skills', input);
    return data.data ?? data;
  },
  async updateSkill(id: string, input: UpsertSkillInput): Promise<AiSkill> {
    const { data } = await api.patch(`/ai-catalog/skills/${id}`, input);
    return data.data ?? data;
  },
  async removeSkill(id: string): Promise<void> {
    await api.delete(`/ai-catalog/skills/${id}`);
  },

  // ── Agent attachments ─────────────────────────────────────────
  async setAgentSkills(agentId: string, skillIds: string[]): Promise<void> {
    await api.put(`/ai-catalog/agents/${agentId}/skills`, { skillIds });
  },
  async setAgentExtraTools(agentId: string, toolIds: string[]): Promise<void> {
    await api.put(`/ai-catalog/agents/${agentId}/extra-tools`, { toolIds });
  },
};
