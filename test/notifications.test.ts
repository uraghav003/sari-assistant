import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAlerts,
  pushAlert,
  markAllRead,
  markAsRead,
  removeAlert,
  clearAlerts,
  unreadCount,
  subscribeAlerts,
  relativeTime,
} from '../src/lib/notifications';
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

  it('handles edge case inputs gracefully without throwing', () => {
    // Missing or non-string inputs
    const a1 = pushAlert({} as unknown as { title: string; body: string });
    expect(a1.title).toBe('');
    expect(a1.body).toBe('');
    expect(a1.channel).toBe('in_app');

    // Invalid channel falls back to in_app
    const a2 = pushAlert({
      title: 'Invalid Channel Alert',
      body: 'Testing channel fallback',
      channel: 'unsupported_channel' as unknown as 'in_app',
    });
    expect(a2.channel).toBe('in_app');
  });

  it('marks individual alert as read by ID', () => {
    const a1 = pushAlert({ title: 'Alert 1', body: 'First' });
    const a2 = pushAlert({ title: 'Alert 2', body: 'Second' });

    expect(unreadCount()).toBe(2);
    markAsRead(a1.id);
    expect(unreadCount()).toBe(1);

    const current = getAlerts();
    expect(current.find((a) => a.id === a1.id)?.read).toBe(true);
    expect(current.find((a) => a.id === a2.id)?.read).toBe(false);
  });

  it('removes alert by ID', () => {
    const a1 = pushAlert({ title: 'Alert 1', body: 'First' });
    const a2 = pushAlert({ title: 'Alert 2', body: 'Second' });

    expect(getAlerts().length).toBe(2);
    removeAlert(a1.id);
    expect(getAlerts().length).toBe(1);
    expect(getAlerts()[0].id).toBe(a2.id);
  });

  it('subscribes to alert updates and unsubscribes cleanly', () => {
    let callCount = 0;
    let lastCount = 0;

    const unsubscribe = subscribeAlerts((items) => {
      callCount += 1;
      lastCount = items.length;
    });

    expect(callCount).toBe(1); // called immediately on subscribe
    expect(lastCount).toBe(0);

    pushAlert({ title: 'Test Sub', body: 'Checking listener' });
    expect(callCount).toBe(2);
    expect(lastCount).toBe(1);

    unsubscribe();
    pushAlert({ title: 'After Unsub', body: 'Should not fire listener' });
    expect(callCount).toBe(2);
  });

  it('survives an errant listener without crashing pushAlert', () => {
    const badListener = () => {
      throw new Error('Exploding UI component listener');
    };

    const unsubscribe = subscribeAlerts(badListener);
    expect(() => {
      pushAlert({ title: 'Resilient Feed', body: 'Continues despite faulty listener' });
    }).not.toThrow();

    expect(getAlerts().length).toBe(1);
    unsubscribe();
  });

  it('formats relative time robustly for past, future, and invalid values', () => {
    const now = Date.now();

    expect(relativeTime(now - 10000)).toBe('just now');
    expect(relativeTime(now - 5 * 60000)).toBe('5m ago');
    expect(relativeTime(now - 3 * 3600000)).toBe('3h ago');

    // Edge cases
    expect(relativeTime(0)).toBe('just now');
    expect(relativeTime(-1000)).toBe('just now');
    expect(relativeTime(NaN)).toBe('just now');
    expect(relativeTime(Infinity)).toBe('just now');
    expect(relativeTime(now + 600000)).toBe('just now'); // future timestamp
  });

  it('caps items at MAX_ITEMS (100 items)', () => {
    for (let i = 0; i < 110; i++) {
      pushAlert({ title: `Alert #${i}`, body: `Content ${i}` });
    }
    expect(getAlerts().length).toBe(100);
  });
});

describe('SARI Banks Knowledgebase Adapter', () => {
  it('loads banks catalog and returns matches for bank queries', () => {
    const kb = require('../src/knowledge/search-engine.cjs');
    expect(typeof kb.searchBanks).toBe('function');
    const res = kb.searchBanks({ query: 'HDFC', product: 'PERSONAL LOAN' });
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results[0].bank).toContain('HDFC');
    expect(res.results[0].startingRate).toBe('9.99%');
  });

  it('generates multi-loan split recommendation for amounts >= 50L', () => {
    const kb = require('../src/knowledge/search-engine.cjs');
    const res = kb.searchBanks({ amount: 6000000 });
    expect(res.splitRecommendation).toBeTruthy();
    expect(res.splitRecommendation.recommended).toBe(true);
    expect(res.splitRecommendation.structure.length).toBe(2);
  });
});
