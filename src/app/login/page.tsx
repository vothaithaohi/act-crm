'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clapperboard, 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Users, 
  Film, 
  Terminal, 
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useCRM } from '@/lib/store/crm-context';
import { ROLE_DETAILS, UserRole } from '@/lib/types/crm';

const DEMO_ACCOUNTS: { role: UserRole; name: string; email: string; dept: string; icon: any }[] = [
  {
    role: 'super_admin',
    name: 'Ban Giám Đốc ACT',
    email: 'admin@act.edu.vn',
    dept: 'Ban Giám Đốc',
    icon: ShieldCheck
  },
  {
    role: 'sales',
    name: 'Trần Thảo My (Tư Vấn)',
    email: 'sales@act.edu.vn',
    dept: 'Phòng Tuyển Sinh',
    icon: Users
  },
  {
    role: 'marketing',
    name: 'Nguyễn Hoàng Long (Ads)',
    email: 'mkt@act.edu.vn',
    dept: 'Phòng Marketing & Growth',
    icon: Sparkles
  },
  {
    role: 'casting',
    name: 'Lê Hải Đăng (Casting Lead)',
    email: 'casting@act.edu.vn',
    dept: 'Bộ Phận Tuyển Vai',
    icon: Film
  },
  {
    role: 'developer',
    name: 'Võ Thái Thao (Kỹ Thuật)',
    email: 'dev@act.edu.vn',
    dept: 'Phòng Kỹ Thuật IT',
    icon: Terminal
  }
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useCRM();
  const router = useRouter();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);

    if (success) {
      router.push('/');
    }
  };

  const handleQuickLogin = async (accountEmail: string) => {
    setIsLoading(true);
    const success = await login(accountEmail);
    setIsLoading(false);

    if (success) {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="p-6 sm:p-8 flex items-center justify-between relative z-10 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight flex items-center gap-2">
              <span className="text-white">ACT ACADEMY</span>
              <span className="text-[10px] bg-brand-500/20 text-brand-400 border border-brand-500/30 font-semibold px-2 py-0.5 rounded uppercase">CRM</span>
            </div>
            <p className="text-xs text-slate-400">Growth & Talent Casting System</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Hệ thống trực tuyến v2.0</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
        <div className="w-full max-w-xl space-y-6">
          {/* Card */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Đăng Nhập Hệ Thống
              </h1>
              <p className="text-xs text-slate-400">
                Nhập tài khoản nhân viên được cấp để truy cập phân hệ làm việc tương ứng
              </p>
            </div>

            {/* Standard Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Email nhân sự
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ví dụ: admin@act.edu.vn hoặc sales@act.edu.vn"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Mật khẩu
                  </label>
                  <span className="text-[11px] text-slate-500">Mặc định: bất kỳ hoặc act2025</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                <span>{isLoading ? 'Đang xác thực...' : 'Đăng Nhập Vào Hệ Thống'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Hoặc chọn nhanh tài khoản trải nghiệm
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* 1-Click Fast Account Selector */}
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 text-center">
                Nhấp vào vai trò dưới đây để hệ thống tự động phân quyền tương ứng:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const roleMeta = ROLE_DETAILS[acc.role];
                  const Icon = acc.icon;

                  return (
                    <button
                      key={acc.role}
                      type="button"
                      onClick={() => handleQuickLogin(acc.email)}
                      disabled={isLoading}
                      className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-left transition-all hover:scale-[1.01] active:scale-[0.99] group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center text-brand-400 group-hover:text-brand-300 group-hover:bg-brand-500/10 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white group-hover:text-brand-300 transition-colors truncate">
                              {acc.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {roleMeta.label.split(' ')[0]}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-slate-400">{acc.email}</span>
                            <span>•</span>
                            <span className="text-slate-400 truncate">{acc.dept}</span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-[11px] text-slate-400 relative z-10 border-t border-slate-900">
        ACT ACADEMY Mini CRM & Talent Casting • Dành riêng cho nhân sự nội bộ được cấp phép
      </footer>
    </div>
  );
}
