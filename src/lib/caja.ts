/** Marca/desmarca una salsa. Si se pasa del máximo del tamaño, se reemplaza la más antigua (igual que la landing). */
export function alternarSalsa(lista: string[], id: string, max: number): string[] {
  if (lista.includes(id)) return lista.filter((x) => x !== id);
  const l = [...lista, id];
  return l.length > max ? l.slice(l.length - max) : l;
}
