import { api } from '@/lib/api';

export type DistributionRule = 'ROUND_ROBIN' | 'LEAST_BUSY' | 'MANUAL';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  distributionRule: DistributionRule;
  isDefault: boolean;
  slaFirstResponse: number | null;
  slaResolution: number | null;
  _count?: { agents: number; conversations: number };
}

export interface DepartmentAgent {
  id: string;
  userOrganization: {
    id: string;
    user: { id: string; name: string | null; email: string; avatarUrl: string | null };
  };
}

export const departmentsService = {
  async list(): Promise<Department[]> {
    const { data } = await api.get('/departments');
    return data.data;
  },
  async create(payload: { name: string; description?: string; distributionRule?: DistributionRule; slaFirstResponse?: number; slaResolution?: number }): Promise<Department> {
    const { data } = await api.post('/departments', payload);
    return data.data;
  },
  async update(id: string, payload: { name?: string; description?: string; distributionRule?: DistributionRule; slaFirstResponse?: number; slaResolution?: number }): Promise<Department> {
    const { data } = await api.patch(`/departments/${id}`, payload);
    return data.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/departments/${id}`);
  },
  async agents(id: string): Promise<DepartmentAgent[]> {
    const { data } = await api.get(`/departments/${id}/agents`);
    return data.data;
  },
  async addAgent(id: string, userId: string): Promise<void> {
    await api.post(`/departments/${id}/agents`, { userId });
  },
  async removeAgent(id: string, userId: string): Promise<void> {
    await api.delete(`/departments/${id}/agents/${userId}`);
  },
};
