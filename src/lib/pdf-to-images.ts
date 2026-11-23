'use client';

// Chuyển file PDF thành ảnh từng trang ngay trên trình duyệt (để chèn vào mô tả, khỏi phải chuyển tay sang PNG).
export const PDF_MAX_PAGES = 20;

export async function pdfToImages(file: File, onPage: (done: number, total: number) => void = () => undefined): Promise<File[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const total = Math.min(doc.numPages, PDF_MAX_PAGES);
  const base = file.name.replace(/\.pdf$/i, '');
  const out: File[] = [];
  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const v1 = page.getViewport({ scale: 1 });
    // Cạnh dài khoảng 2000px: đủ nét để đọc chữ kịch bản
    const viewport = page.getViewport({ scale: Math.min(4, 2000 / Math.max(v1.width, v1.height)) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
    if (!blob) throw new Error('encode');
    out.push(new File([blob], `${base}${total > 1 ? ` - trang ${i}` : ''}.png`, { type: 'image/png' }));
    page.cleanup();
    onPage(i, total);
  }
  await doc.destroy();
  return out;
}
