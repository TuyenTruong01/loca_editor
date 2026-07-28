export type ParsedRanges = { groups: number[][]; selected: Set<number>; error: string };

export function parsePageRanges(value: string, totalPages: number): ParsedRanges {
  const fail = (error: string): ParsedRanges => ({ groups: [], selected: new Set(), error });
  if (!value.trim()) return fail("Vui lòng nhập trang cần cắt.");
  if (!/^[\d\s,|\-]+$/.test(value)) return fail("Phạm vi trang chứa ký tự không hợp lệ.");
  const groups: number[][] = [];
  for (const rawGroup of value.split("|")) {
    if (!rawGroup.trim()) return fail("Nhóm trang không được để trống.");
    const pages: number[] = []; const seen = new Set<number>();
    for (const rawToken of rawGroup.split(",")) {
      const token = rawToken.trim();
      if (!token) return fail("Mục trang không được để trống.");
      let values: number[];
      if (token.includes("-")) {
        const match = token.match(/^(\d+)\s*-\s*(\d+)$/);
        if (!match) return fail(`Khoảng trang không hợp lệ: ${token}.`);
        const start = Number(match[1]); const end = Number(match[2]);
        if (start > end) return fail(`Khoảng trang bị đảo: ${token}.`);
        values = Array.from({ length: end - start + 1 }, (_, index) => start + index);
      } else {
        if (!/^\d+$/.test(token)) return fail(`Trang không hợp lệ: ${token}.`);
        values = [Number(token)];
      }
      for (const page of values) {
        if (page < 1) return fail("Số trang phải lớn hơn hoặc bằng 1.");
        if (totalPages > 0 && page > totalPages) return fail(`Trang ${page} vượt quá tổng số ${totalPages} trang.`);
        if (!seen.has(page)) { pages.push(page); seen.add(page); }
      }
    }
    groups.push(pages);
  }
  return { groups, selected: new Set(groups.flat()), error: "" };
}
