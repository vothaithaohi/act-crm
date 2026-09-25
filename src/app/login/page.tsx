'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clapperboard, 
  Mail, 
  Lock, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  AlertCircle,
  UserCheck,
  LogOut
} from 'lucide-react';
import { useCRM } from '@/lib/store/crm-context';
import { ROLE_DETAILS } from '@/lib/types/crm';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { login, logout, currentUser, isAuthenticated } = useCRM();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu tài khoản.');
      return;
    }

    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);

    if (success) {
      router.push('/');
    } else {
      setErrorMessage('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
    }
  };

  const handleLogoutCurrent = () => {
    logout();
    setEmail('');
    setPassword('');
    setErrorMessage('');
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
            <p className="text-xs text-slate-400 font-medium">Growth & Talent Casting System</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Hệ thống phân quyền bảo mật</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
        <div className="w-full max-w-md space-y-6">

          {/* If there is already an active session, show status card with option to proceed or logout */}
          {isAuthenticated && currentUser ? (
            <div className="bg-slate-900/90 backdrop-blur-xl border border-brand-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center animate-in fade-in-50">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-400 flex items-center justify-center mx-auto shadow-inner">
                <UserCheck className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-brand-400 uppercase tracking-wider">
                  Đang Đăng Nhập
                </span>
                <h2 className="text-xl font-bold text-white">
                  {currentUser.full_name}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {currentUser.email}
                </p>
                <div className="pt-1.5">
                  <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                    {ROLE_DETAILS[currentUser.role]?.label || currentUser.role} • {currentUser.department || 'ACT Academy'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <span>Tiếp Tục Vào Hệ Thống CRM</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleLogoutCurrent}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800/80 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-900/60 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng Xuất Tài Khoản Này</span>
                </button>
              </div>
            </div>
          ) : (
            /* Secure Login Card */
            <div className="bg-slate-900/85 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-brand-400 flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Đăng Nhập Hệ Thống
                </h1>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Nhập tài khoản email và mật khẩu được cấp phép để truy cập vào phân hệ làm việc ACT CRM.
                </p>
              </div>

              {/* Error message banner */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in-50">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Secure Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Địa chỉ Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="email@act.edu.vn"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Mật khẩu
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-800 text-brand-600 focus:ring-brand-500 bg-slate-950"
                    />
                    <span>Ghi nhớ đăng nhập</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  <span>{isLoading ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="pt-2 text-center border-t border-slate-800/80">
                <p className="text-[11px] text-slate-400">
                  Nếu bạn quên mật khẩu hoặc cần cấp tài khoản mới, vui lòng liên hệ <span className="text-white font-medium">Ban Giám Đốc</span> hoặc <span className="text-white font-medium">Phòng Kỹ Thuật IT</span>.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-[11px] text-slate-400 relative z-10 border-t border-slate-900">
        ACT ACADEMY Mini CRM & Talent Casting • Hệ thống phân quyền nội bộ bảo mật
      </footer>
    </div>
  );
}
