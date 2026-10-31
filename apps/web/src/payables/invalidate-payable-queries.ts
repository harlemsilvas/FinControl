import type { QueryClient } from '@tanstack/react-query';

// Cancelamento altera tanto o detalhe quanto as projeções financeiras.
export async function invalidatePayableQueries(client: QueryClient): Promise<void> {
  const prefixes = new Set(['payables', 'payable', 'recurrences', 'agenda', 'agenda-dashboard', 'dashboard', 'payables-forecast', 'payment-eligible-installments', 'planned-vs-paid']);
  await client.invalidateQueries({ predicate: query => prefixes.has(String(query.queryKey[0])) });
}
