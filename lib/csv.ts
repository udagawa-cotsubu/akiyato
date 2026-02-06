/**
 * CSV 用の BOM 付き UTF-8 でダウンロードする
 */
export function downloadCsv(
  headers: string[],
  rows: (string | number)[][],
  filename: string
): void {
  const escape = (cell: string | number): string => {
    const s = String(cell);
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headerLine = headers.map(escape).join(",");
  const dataLines = rows.map((row) => row.map(escape).join(","));
  const csv = [headerLine, ...dataLines].join("\r\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
