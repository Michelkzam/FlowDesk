import { describe, it, expect } from 'vitest';

const SLA_HOURS = {
  emergency: 2,
  high: 8,
  normal: 24,
  low: 48,
};

function calculateTimeRemaining(createdDate, priorityHours) {
  const created = new Date(createdDate);
  const deadline = new Date(created.getTime() + priorityHours * 60 * 60 * 1000);
  const now = new Date();
  const diff = deadline - now;

  if (diff <= 0) {
    const overdue = Math.abs(diff);
    const hours = Math.floor(overdue / (1000 * 60 * 60));
    const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
    return { expired: true, hours, minutes, totalMinutes: Math.floor(overdue / (1000 * 60)) };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { expired: false, hours, minutes, totalMinutes: Math.floor(diff / (1000 * 60)) };
}

describe('SLA Timer', () => {
  it('deve calcular tempo restante corretamente para prioridade normal', () => {
    const now = new Date();
    const createdDate = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const priorityHours = SLA_HOURS.normal;

    const result = calculateTimeRemaining(createdDate, priorityHours);

    expect(result.expired).toBe(false);
    expect(result.hours).toBeGreaterThanOrEqual(11);
    expect(result.hours).toBeLessThanOrEqual(12);
  });

  it('deve detectar ticket vencido', () => {
    const now = new Date();
    const createdDate = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const priorityHours = SLA_HOURS.normal;

    const result = calculateTimeRemaining(createdDate, priorityHours);

    expect(result.expired).toBe(true);
    expect(result.hours).toBe(24);
  });

  it('deve ter prazo de 2 horas para prioridade crítica', () => {
    expect(SLA_HOURS.emergency).toBe(2);
  });

  it('deve ter prazo de 8 horas para prioridade alta', () => {
    expect(SLA_HOURS.high).toBe(8);
  });

  it('deve ter prazo de 24 horas para prioridade média', () => {
    expect(SLA_HOURS.normal).toBe(24);
  });

  it('deve ter prazo de 48 horas para prioridade baixa', () => {
    expect(SLA_HOURS.low).toBe(48);
  });

  it('deve calcular corretamente quando faltam menos de 1 hora', () => {
    const now = new Date();
    const createdDate = new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString();
    const priorityHours = SLA_HOURS.normal;

    const result = calculateTimeRemaining(createdDate, priorityHours);

    expect(result.expired).toBe(false);
    expect(result.hours).toBe(1);
  });

  it('deve retornar totalMinutes para cálculo de cor', () => {
    const now = new Date();
    const createdDate = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString();
    const priorityHours = SLA_HOURS.normal;

    const result = calculateTimeRemaining(createdDate, priorityHours);

    expect(result.totalMinutes).toBe(240);
  });
});
