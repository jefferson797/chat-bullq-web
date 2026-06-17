import { api } from '@/lib/api';

export type Weekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
export type DayWindows = [string, string][];

export interface AutoReplyMessage {
  enabled: boolean;
  text: string;
}

export interface AutoReplyConfig {
  enabled: boolean;
  timezone: string;
  businessHours: Record<Weekday, DayWindows>;
  lunch: { enabled: boolean; start: string; end: string };
  antiSpamHours: number;
  greeting: AutoReplyMessage;
  lunchMsg: AutoReplyMessage;
  offHours: AutoReplyMessage;
}

export const autoRepliesService = {
  async get(): Promise<AutoReplyConfig> {
    const { data } = await api.get('/auto-replies');
    return data.data ?? data;
  },
  async update(config: AutoReplyConfig): Promise<AutoReplyConfig> {
    const { data } = await api.put('/auto-replies', config);
    return data.data ?? data;
  },
};
