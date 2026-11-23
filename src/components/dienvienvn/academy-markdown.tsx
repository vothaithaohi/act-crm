import ReactMarkdown, { type Components } from 'react-markdown';

// Hiển thị nội dung bài Academy (Markdown) — dùng chung cho trang web và ô xem trước trong CRM.
// Không cho HTML thô (an toàn); link ngoài mở tab mới.
const C: Components = {
  h1: ({ children }) => <h2 className="mt-10 text-[28px] font-semibold leading-[1.2] tracking-[-0.01em]">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-10 text-[26px] font-semibold leading-[1.2] tracking-[-0.01em]">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-8 text-[21px] font-semibold leading-[1.25]">{children}</h3>,
  p: ({ children }) => <p className="mt-5 text-[17px] leading-[1.7]">{children}</p>,
  ul: ({ children }) => <ul className="mt-5 list-disc space-y-2 pl-6 text-[17px] leading-[1.6]">{children}</ul>,
  ol: ({ children }) => <ol className="mt-5 list-decimal space-y-2 pl-6 text-[17px] leading-[1.6]">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="mt-6 border-l-[3px] border-[#1d1d1f] pl-5 text-[18px] italic leading-[1.6] text-[#424245]">{children}</blockquote>,
  a: ({ href, children }) => {
    const external = !!href && /^https?:\/\//i.test(href) && !/dienvienvn\.com/i.test(href);
    return (
      <a href={href} className="font-medium underline underline-offset-2" {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  },
  img: ({ src, alt }) =>
    typeof src === 'string' && src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt || ''} loading="lazy" className="mt-6 w-full rounded-[16px] bg-[#f5f5f7] object-cover" />
    ) : null,
  hr: () => <hr className="my-10 border-[#e0e0e5]" />,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  code: ({ children }) => <code className="rounded bg-[#f5f5f7] px-1.5 py-0.5 text-[15px]">{children}</code>
};

/** overrides: thay cách hiện link / ảnh (VD mở trong popup ở phần yêu cầu self-tape). */
export function AcademyMarkdown({ content, className = '', overrides }: { content: string; className?: string; overrides?: Partial<Components> }) {
  return (
    <div className={`text-[#1d1d1f] [&>*:first-child]:mt-0 ${className}`}>
      <ReactMarkdown components={overrides ? { ...C, ...overrides } : C} skipHtml>
        {content}
      </ReactMarkdown>
    </div>
  );
}
