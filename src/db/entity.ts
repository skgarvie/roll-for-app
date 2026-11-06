import { SCHEMA_VERSION } from './db';
import { newId } from './ids';
import type { Entity } from './types';

export function newEntity(now = Date.now()): Entity {
  return { id: newId(), createdAt: now, updatedAt: now, schemaVersion: SCHEMA_VERSION };
}

export class ValidationError extends Error {
  override name = 'ValidationError';
}

/** Trims a required text field and rejects empty values. */
export function requiredText(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new ValidationError(`${field} is required.`);
  return trimmed;
}

/** Trims an optional text field; empty becomes undefined. */
export function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
