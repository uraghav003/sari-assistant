import { describe, it, expect, beforeEach } from 'vitest';
import { getAlerts, pushAlert, markAllRead, clearAlerts, unreadCount } from '../src/lib/notifications';

describe('SARI Sovereign Notifications & Alerts', () => {
  beforeEach(() => {
    clearAlerts();
  });

  it('initializes with default security system alert or empty state', () => {
    const alerts = getAlerts();
    expect(Array.isArray(alerts)).toBe(true);
  });

  it('pushes new alert and increments unread count', () => {
    pushAlert({
      title: 'Test Security Audit',
      body: 'Zero-trust perimeter verified.',
      channel: 'system',
    });

    const alerts = getAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].title).toBe('Test Security Audit');
    expect(unreadCount()).toBeGreaterThan(0);
  });

  it('marks all alerts as read', () => {
    pushAlert({
      title: 'Lead Intake Alert',
      body: 'New client assigned to RM.',
    });

    expect(unreadCount()).toBe(1);
    markAllRead();
    expect(unreadCount()).toBe(0);
    expect(getAlerts()[0].read).toBe(true);
  });

  it('clears all alerts successfully', () => {
    pushAlert({
      title: 'Temp Warning',
      body: 'Check threshold.',
    });

    expect(getAlerts().length).toBe(1);
    clearAlerts();
    expect(getAlerts().length).toBe(0);
    expect(unreadCount()).toBe(0);
  });
});
