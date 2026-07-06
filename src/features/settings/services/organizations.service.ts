import { api } from '@/lib/api';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export const organizationsService = {
  async getCurrent(): Promise<Organization> {
    const { data } = await api.get('/organizations/current');
    return data.data;
  },
  async update(payload: { name?: string; logoUrl?: string | null }): Promise<Organization> {
    const { data } = await api.patch('/organizations/current', payload);
    return data.data;
  },
  async uploadLogo(file: File): Promise<{ logoUrl: string }> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/organizations/current/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },
};
