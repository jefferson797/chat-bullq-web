import { api } from '@/lib/api';

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  shortLine: string;
  pitch: string;
  price: string | null;
  paymentLink: string | null;
  targetAudience: string | null;
  differentiators: string[];
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPayload {
  slug?: string;
  name?: string;
  category?: string;
  shortLine?: string;
  pitch?: string;
  price?: string;
  paymentLink?: string;
  targetAudience?: string;
  differentiators?: string[];
  isActive?: boolean;
  order?: number;
}

export const productsService = {
  async list(): Promise<Product[]> {
    const { data } = await api.get('/products', { params: { includeInactive: 'true' } });
    return data.data;
  },
  async create(payload: ProductPayload): Promise<Product> {
    const { data } = await api.post('/products', payload);
    return data.data;
  },
  async update(id: string, payload: ProductPayload): Promise<Product> {
    const { data } = await api.patch(`/products/${id}`, payload);
    return data.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },
};
