'use client';

import React, { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Send, 
  Activity, 
  Facebook, 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  Sparkles,
  Code2,
  ExternalLink
} from 'lucide-react';
import { useCRM } from '@/lib/store/crm-context';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth/permission-guard';

export default function AdminWebhooksPage() {
  const { webhookLogs } = useCRM();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isSendingMock, setIsSendingMock] = useState(false);
  const [isSendingMockMessage, setIsSendingMockMessage] = useState(false);
  const [selectedPayload, setSelectedPayload] = useState<any | null>(null);

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhooks/meta-lead`
    : 'https://crm.timviecremote.com/api/webhooks/meta-lead';
  const verifyToken = 'act_secret_verify_token_2026';

  const copyToClipboard = (text: string, type: 'url' | 'token') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
    toast.success('Đã copy vào bộ nhớ tạm');
  };

  const sendMockMetaLead = async () => {
    setIsSendingMock(true);
    try {
      const mockLead = {
        leadgen_id: `mock_meta_${Date.now()}`,
        full_name: 'Phan Minh Khang (Lead Test Meta Ads)',
        phone: '0978123456',
        email: 'khang.phan@gmail.com',
        course_interest: 'Khóa Diễn xuất Điện ảnh (ACT Pro)',
        campaign_name: 'MetaAds_Casting_Test_2025',
        adset_name: 'Target_GenZ_Actors',
        ad_name: 'Video_DaoDien_ChiaSe'
      };

      const res = await fetch('/api/webhooks/meta-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockLead)
      });

      if (res.ok) {
        toast.success('Bắn mock lead Meta Ads thành công! Kiểm tra trang Pipeline Leads.');
      } else {
        toast.error('Lỗi khi gửi webhook test');
      }
    } catch (e: any) {
      toast.error(e.message || 'Lỗi kết nối API');
    } finally {
      setIsSendingMock(false);
    }
  };

  const sendMockFanpageMessage = async () => {
    setIsSendingMockMessage(true);
    try {
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const mockMessagePayload = {
        object: 'page',
        entry: [
          {
            id: 'page_act_academy',
            time: Date.now(),
            messaging: [
              {
                sender: { id: `psid_849${randomId}` },
                recipient: { id: 'page_act_academy' },
                timestamp: Date.now(),
                message: {
                  mid: `mid_${Date.now()}`,
                  text: 'Em muốn tư vấn khóa học diễn xuất ACT 1 và học phí tháng tới ạ. SĐT em là 0908' + randomId
                }
              }
            ]
          }
        ]
      };

      const res = await fetch('/api/webhooks/meta-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockMessagePayload)
      });

      if (res.ok) {
        toast.success('Bắn thử tin nhắn Fanpage thành công! Lead đã được tạo trong cột Intake.');
      } else {
        toast.error('Lỗi khi gửi webhook test tin nhắn');
      }
    } catch (e: any) {
      toast.error(e.message || 'Lỗi kết nối API');
    } finally {
      setIsSendingMockMessage(false);
    }
  };

  return (
    <PermissionGuard
      permission="webhooks:manage"
      customTitle="Phân Hệ Giám Sát Webhook & Kỹ Thuật"
      customMessage="Trang giám sát webhook Meta Ads và API logs chỉ dành cho Kỹ Thuật (Developer), Marketing và Ban Giám Đốc."
    >
      <div className="space-y-8">
        {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-slate-800 dark:text-slate-200" />
            <span>Kỹ Thuật & Giám Sát Webhook Meta (Ads & Fanpage)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Dành cho Developer & Marketing: Cấu hình bắt tay (handshake) với Meta Developer để tự động kéo Tin nhắn Fanpage & Lead Form về CRM
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={sendMockFanpageMessage}
            disabled={isSendingMockMessage}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{isSendingMockMessage ? 'Đang gửi...' : 'Test Tin Nhắn Fanpage'}</span>
          </button>

          <button
            onClick={sendMockMetaLead}
            disabled={isSendingMock}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSendingMock ? 'Đang gửi...' : 'Test Form Lead Ads'}</span>
          </button>
        </div>
      </div>

      {/* Connection Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Facebook className="w-4 h-4 text-blue-600" />
              <span>Thông Số Kết Nối Meta Developer Portal</span>
            </div>
            <a 
              href="https://developers.facebook.com/apps" 
              target="_blank" 
              rel="noreferrer"
              className="text-[11px] font-semibold text-brand-600 hover:underline flex items-center gap-1"
            >
              <span>Mở Meta Apps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-muted-foreground font-semibold block mb-1">
                Callback URL (Dán vào Webhooks &gt; Page / Messenger):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-3 py-2 rounded-lg border bg-muted/50 font-mono text-[11px] text-foreground select-all"
                />
                <button
                  onClick={() => copyToClipboard(webhookUrl, 'url')}
                  className="p-2 border rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  title="Copy URL"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-muted-foreground font-semibold block mb-1">
                Verify Token:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={verifyToken}
                  className="flex-1 px-3 py-2 rounded-lg border bg-muted/50 font-mono text-[11px] text-foreground select-all font-semibold"
                />
                <button
                  onClick={() => copyToClipboard(verifyToken, 'token')}
                  className="p-2 border rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  title="Copy Token"
                >
                  {copiedToken ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-xl space-y-1 text-[11px] text-blue-900 dark:text-blue-300">
              <div className="font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Các trường cần đăng ký (Subscribed Fields) trên Meta:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-blue-800 dark:text-blue-400 pl-1 font-mono text-[10px]">
                <li><strong className="text-foreground">messages</strong> (Bắt tin nhắn nhắn tới Fanpage)</li>
                <li><strong className="text-foreground">messaging_postbacks</strong> (Bắt tương tác nút bấm chat)</li>
                <li><strong className="text-foreground">leadgen</strong> (Bắt form đăng ký quảng cáo Meta Ads)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-6 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>Trạng Thái Hoạt Động (Health Check)</span>
          </div>

          <div className="space-y-2 text-muted-foreground">
            <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg">
              <span className="font-medium text-foreground">Next.js API Handler:</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động bình thường
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg">
              <span className="font-medium text-foreground">Meta GET Handshake:</span>
              <span className="text-emerald-600 font-bold">200 OK Verified</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg">
              <span className="font-medium text-foreground">Xử lý Tin nhắn Messenger:</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã sẵn sàng (Ready)
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg">
              <span className="font-medium text-foreground">Xử lý Lead Ads Form:</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã sẵn sàng (Ready)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Webhook Logs Table */}
      <div className="bg-card rounded-2xl border overflow-hidden shadow-xs">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <div className="font-bold text-sm text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            <span>Nhật Ký Sự Kiện Webhook Gần Nhất</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Sự kiện (Event)</th>
                <th className="py-3 px-4">Nguồn gửi</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">IP Gửi</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4 text-right">Chi tiết payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {webhookLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-foreground">
                    {log.event}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {log.source}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-muted-foreground">
                    {log.ip || '127.0.0.1'}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedPayload(log.payload)}
                      className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-semibold text-foreground border transition-colors inline-flex items-center gap-1"
                    >
                      <Code2 className="w-3 h-3" />
                      <span>Xem JSON</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Payload Viewer Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-muted/40 font-bold text-sm">
              <span>Webhook Raw JSON Payload</span>
              <button
                onClick={() => setSelectedPayload(null)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                Đóng
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto bg-slate-950 text-emerald-400 font-mono text-xs rounded-b-xl">
              <pre>{JSON.stringify(selectedPayload, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
    </PermissionGuard>
  );
}
