export function coerceDate(
  value: Date | string | number | null | undefined,
): Date | undefined {
  if (!value) return undefined;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function toIsoDateString(
  value: Date | string | number | null | undefined,
): string | undefined {
  return coerceDate(value)?.toISOString();
}

export function getDateYear(
  value: Date | string | number | null | undefined,
): number | undefined {
  return coerceDate(value)?.getFullYear();
}
