import { api } from '@/lib/api';

export interface Member {
  id: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'AGENT';
  agentStatus: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    isActive: boolean;
  };
}

export interface Invitation {
  id: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'AGENT';
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  token: string;
  expiresAt: string;
  createdAt: string;
  invitedBy?: { id: string; name: string; email: string } | null;
}

export const membersService = {
  async list(): Promise<Member[]> {
    const { data } = await api.get('/organizations/members');
    return data.data;
  },
  async listInvitations(): Promise<Invitation[]> {
    const { data } = await api.get('/organizations/invitations');
    return data.data;
  },
  async revokeInvitation(invitationId: string): Promise<void> {
    await api.delete(`/organizations/invitations/${invitationId}`);
  },
  async invite(payload: { email: string; role?: string }): Promise<any> {
    const { data } = await api.post('/organizations/members/invite', payload);
    return data.data;
  },
  async updateRole(memberId: string, role: string): Promise<any> {
    const { data } = await api.patch(`/organizations/members/${memberId}/role`, { role });
    return data.data;
  },
  async updateMember(memberId: string, payload: { name?: string; isActive?: boolean }): Promise<any> {
    const { data } = await api.patch(`/organizations/members/${memberId}`, payload);
    return data.data;
  },
  async resetPassword(memberId: string, newPassword: string): Promise<void> {
    await api.post(`/organizations/members/${memberId}/reset-password`, { newPassword });
  },
  async remove(memberId: string): Promise<void> {
    await api.delete(`/organizations/members/${memberId}`);
  },
};
