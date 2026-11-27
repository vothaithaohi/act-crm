import React from 'react';
import { AcademyMarkdown } from '@/components/dienvienvn/academy-markdown';

/** Hiện biên bản Markdown; bảng (| a | b |) tự vẽ vì trình hiển thị Markdown không có sẵn bảng. */
export function RecapMarkdown({ content }: { content: string }) {
  const blocks: { table: boolean; lines: string[] }[] = [];
  for (const line of content.split('\n')) {
    const table = /^\s*\|.*\|\s*$/.test(line);
    const last = blocks[blocks.length - 1];
    if (last && last.table === table) last.lines.push(line);
    else blocks.push({ table, lines: [line] });
  }
  return (
    <div className="recap-md [&_h2]:!mt-7 [&_h2]:!text-[19px] [&_h3]:!text-[16px] [&_p]:!mt-3 [&_p]:!text-[15px] [&_ul]:!mt-3 [&_ul]:!text-[15px] [&_ol]:!text-[15px] [&>*:first-child>*:first-child]:!mt-0">
      {blocks.map((b, i) =>
        b.table ? <Table key={i} lines={b.lines} /> : <AcademyMarkdown key={i} content={b.lines.join('\n')} />
      )}
    </div>
  );
}

function cells(line: string) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim().replace(/\*\*(.+?)\*\*/g, '$1'));
}

function Table({ lines }: { lines: string[] }) {
  const rows = lines.filter(l => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map(cells);
  const [head, ...body] = rows;
  if (!head) return null;
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border">
      <table className="w-full text-[14px]">
        <thead className="bg-muted/60">
          <tr>
            {head.map((c, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i} className="border-t align-top">
              {head.map((_, j) => (
                <td key={j} className="px-3 py-2">{r[j] || ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
