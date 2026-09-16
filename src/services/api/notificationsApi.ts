import { authStorage } from '../../auth/authApi';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  reference_type?: string | null;
  reference_id?: string | null;
  is_read: boolean;
  created_at: string;
}

function getAuthHeader(): Record<string, string> {
  const token = authStorage.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const notificationsApi = {
  async getNotifications(): Promise<NotificationItem[]> {
    const res = await fetch('/api/notifications', {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      return [];
    }
    return res.json();
  },

  async markAsRead(id: string): Promise<boolean> {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeader(),
      },
    });
    return res.ok;
  },

  async markAllAsRead(): Promise<boolean> {
    const res = await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
      },
    });
    return res.ok;
  },
};
