export function paramStr(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function paramInt(value: string | string[] | undefined): number {
  return parseInt(paramStr(value));
}