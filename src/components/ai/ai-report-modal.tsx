'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  BarChart3, 
  X, 
  Copy, 
  Check, 
  Loader2, 
  Bot, 
  RefreshCw,
  FileText,
  DollarSign
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'ads_optimization' | 'finance';
}

export function AIReportModal({ isOpen, onClose, initialType = 'ads_optimization' }: AIReportModalProps) {
  const [reportType, setReportType] = useState<'ads_optimization' | 'finance'>(initialType);
  const [loading, setLoading] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [generatedAt, setGeneratedAt] = useState<string>('');

  useEffect(() => {
    if (initialType) {
      setReportType(initialType);
    }
  }, [initialType]);

  const fetchReport = async (type: 'ads_optimization' | 'finance') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: type })
      });

      if (!res.ok) {
        throw new Error(`Lỗi kết nối máy chủ (${res.status})`);
      }

      const data = await res.json();
      if (data.reportMarkdown) {
        setReportMarkdown(data.reportMarkdown);
        setModelUsed(data.model || 'claude-3-5-sonnet-20241022');
        setGeneratedAt(new Date(data.generatedAt).toLocaleTimeString('vi-VN'));
      } else {
        throw new Error(data.error || 'Không nhận được nội dung báo cáo');
      }
    } catch (err: any) {
      console.error('Failed to generate AI report:', err);
      setError(err.message || 'Có lỗi xảy ra khi tạo báo cáo AI');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport(reportType);
    }
  }, [isOpen, reportType]);

  const handleCopy = () => {
    if (!reportMarkdown) return;
    navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">
                  Claude 3.5 Sonnet AI Intelligence
                </h3>
                <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded-full text-amber-300 border border-white/10">
                  Model: {modelUsed || 'claude-3-5-sonnet'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Báo cáo phân tích chuyên sâu cho Ban Lãnh Đạo & Marketing ACT Academy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Controls Bar */}
        <div className="p-3 border-b bg-muted/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportType('ads_optimization')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                reportType === 'ads_optimization'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-background hover:bg-muted text-muted-foreground border'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>🤖 Phân Tích Tối Ưu Ads & Funnel</span>
            </button>

            <button
              onClick={() => setReportType('finance')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                reportType === 'finance'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-background hover:bg-muted text-muted-foreground border'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>📊 Báo Cáo Tài Chính & Doanh Thu</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchReport(reportType)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-background hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              onClick={handleCopy}
              disabled={loading || !reportMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/50 transition-colors disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép!' : 'Copy Markdown'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-foreground bg-card">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/30 animate-pulse">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base">Claude đang phân tích dữ liệu tuyển sinh...</h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Truy vấn dữ liệu từ phễu Lead, tỷ lệ chuyển đổi Audition và phân bổ các cấp lớp ACT 1-4
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-rose-600 font-semibold">{error}</p>
              <button
                onClick={() => fetchReport(reportType)}
                className="px-4 py-2 bg-brand-500 text-white rounded-lg text-xs font-semibold hover:bg-brand-600"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground border-b pb-2 mb-4" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-lg font-bold tracking-tight text-brand-600 dark:text-brand-400 mt-6 mb-2" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-foreground mt-4 mb-1" {...props} />,
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4 border rounded-xl">
                      <table className="w-full text-xs text-left border-collapse" {...props} />
                    </div>
                  ),
                  th: ({ node, ...props }) => <th className="p-2.5 bg-muted font-bold border-b border-border/80 text-foreground" {...props} />,
                  td: ({ node, ...props }) => <td className="p-2.5 border-b border-border/60 text-muted-foreground font-medium" {...props} />,
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-r-xl my-3 text-xs italic text-foreground" {...props} />
                  ),
                  ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1.5 text-xs text-muted-foreground" {...props} />,
                  li: ({ node, ...props }) => <li className="text-xs text-muted-foreground font-normal leading-relaxed" {...props} />,
                  p: ({ node, ...props }) => <p className="text-xs text-muted-foreground leading-relaxed font-normal" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />
                }}
              >
                {reportMarkdown}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Báo cáo tạo lúc: {generatedAt || 'Mới nhất'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border bg-background hover:bg-muted text-xs font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
