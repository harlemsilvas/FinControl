export function safe(value: string): string { return /^[=+\-@]/.test(value) ? `'${value}` : value; }
export function date(value: string): string { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)); }
