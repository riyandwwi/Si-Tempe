import { prisma } from "@/lib/prisma";

export interface KategoriNode {
  id: string;
  nama: string;
  indukId: string | null;
}

export interface KategoriWithPath extends KategoriNode {
  jalur: string;
  isLeaf: boolean;
}

export function buildKategoriHelpers(all: KategoriNode[]) {
  const byId = new Map<string, KategoriNode>();
  const childrenMap = new Map<string, string[]>();

  for (const k of all) {
    byId.set(k.id, k);
    if (k.indukId) {
      const list = childrenMap.get(k.indukId) ?? [];
      list.push(k.id);
      childrenMap.set(k.indukId, list);
    }
  }

  function getPath(id: string): string {
    const names: string[] = [];
    let current = byId.get(id);
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      names.unshift(current.nama);
      current = current.indukId ? byId.get(current.indukId) : undefined;
    }
    return names.join(" › ");
  }

  function isLeaf(id: string): boolean {
    return (childrenMap.get(id)?.length ?? 0) === 0;
  }

  function getDescendantIds(id: string): string[] {
    const result: string[] = [];
    const stack = [id];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const curr = stack.pop()!;
      if (visited.has(curr)) continue;
      visited.add(curr);
      result.push(curr);
      const kids = childrenMap.get(curr) ?? [];
      for (const kid of kids) stack.push(kid);
    }
    return result;
  }

  const withPath: KategoriWithPath[] = all
    .map((k) => ({
      ...k,
      jalur: getPath(k.id),
      isLeaf: isLeaf(k.id),
    }))
    .sort((a, b) => a.jalur.localeCompare(b.jalur, "id"));

  return { byId, childrenMap, getPath, isLeaf, getDescendantIds, withPath };
}

export async function getAllKategoriWithPaths(): Promise<KategoriWithPath[]> {
  const all = await prisma.kategori.findMany({
    select: { id: true, nama: true, indukId: true },
  });
  return buildKategoriHelpers(all).withPath;
}

export async function isLeafKategori(kategoriId: string): Promise<boolean> {
  const kat = await prisma.kategori.findUnique({
    where: { id: kategoriId },
    select: { id: true, _count: { select: { anak: true } } },
  });
  if (!kat) return false;
  return kat._count.anak === 0;
}
