'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  Users, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  X,
  Phone,
  Mail,
  Building,
  KeyRound,
  Eye
} from 'lucide-react';
import { useCRM } from '@/lib/store/crm-context';
import { Profile, UserRole, ROLE_DETAILS } from '@/lib/types/crm';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const { teamMembers, currentUser, addTeamMember, updateTeamMember, deleteTeamMember, switchRole } = useCRM();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Profile | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Phòng Tuyển Sinh');
  const [role, setRole] = useState<UserRole>('sales');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const openCreateModal = () => {
    setEditingMember(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setDepartment('Phòng Tuyển Sinh');
    setRole('sales');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (member: Profile) => {
    setEditingMember(member);
    setFullName(member.full_name);
    setEmail(member.email);
    setPhone(member.phone || '');
    setDepartment(member.department || 'Phòng Tuyển Sinh');
    setRole(member.role);
    setStatus(member.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      alert('Vui lòng nhập Họ tên và Email!');
      return;
    }

    if (editingMember) {
      updateTeamMember({
        ...editingMember,
        full_name: fullName,
        email,
        phone,
        department,
        role,
        status
      });
    } else {
      addTeamMember({
        full_name: fullName,
        email,
        phone,
        department,
        role,
        status,
        last_login: new Date().toISOString()
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-brand-600" />
            <span>Quản Trị Nhân Sự & Phân Quyền (RBAC)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Quản lý tài khoản nội bộ, cấp quyền truy cập theo vai trò: Ban Giám Đốc, Sales, Marketing, Casting, Developer
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Thêm Nhân Viên Mới</span>
        </button>
      </div>

      {/* Role Switcher Demo Bar */}
      <div className="p-4 bg-muted/60 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-amber-500" />
            <span>Trải nghiệm nhanh giao diện theo từng Vai Trò:</span>
          </span>
          <p className="text-muted-foreground mt-0.5">
            Click vào nút dưới đây để đổi góc nhìn của từng bộ phận nhân sự
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(['super_admin', 'sales', 'marketing', 'casting', 'developer'] as UserRole[]).map((r) => {
            const isCurrent = currentUser.role === r;
            const details = ROLE_DETAILS[r];
            return (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`px-3 py-1.5 rounded-lg font-semibold border transition-all text-xs flex items-center gap-1.5 ${
                  isCurrent 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{details.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Team Members Table */}
      <div className="bg-card rounded-2xl border overflow-hidden shadow-xs">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <div className="font-bold text-sm text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-600" />
            <span>Danh Sách Nhân Viên ({teamMembers.length})</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Nhân sự</th>
                <th className="py-3 px-4">Phòng ban</th>
                <th className="py-3 px-4">Vai trò (Role)</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Đăng nhập gần nhất</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {teamMembers.map((member) => {
                const details = ROLE_DETAILS[member.role] || {
                  label: member.role,
                  badge: 'bg-muted text-muted-foreground'
                };

                return (
                  <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <span>{member.full_name}</span>
                        {member.id === currentUser.id && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                            Bạn
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{member.email}</span>
                        {member.phone && <span>• {member.phone}</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-medium text-foreground">
                      {member.department || 'Phòng Tuyển Sinh'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-lg border ${details.badge}`}>
                        {details.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {member.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                          <CheckCircle2 className="w-3 h-3" /> Đang hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Đã tạm khóa
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {formatDate(member.last_login)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                          title="Sửa nhân sự"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa tài khoản ${member.full_name}?`)) {
                              deleteTeamMember(member.id);
                            }
                          }}
                          disabled={member.id === currentUser.id}
                          className="p-1.5 hover:bg-rose-50 text-muted-foreground hover:text-rose-600 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RBAC Matrix Guide */}
      <div className="bg-card rounded-2xl border p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-brand-600" />
          <span>Bảng Ma Trận Quyền Hạn Thực Tế (RBAC Matrix)</span>
        </h3>
        <p className="text-xs text-muted-foreground">
          Bảng quy chiếu các quyền thao tác tương ứng với từng vai trò trên hệ thống
        </p>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs border">
            <thead className="bg-muted/70 text-[11px] uppercase font-bold text-foreground">
              <tr>
                <th className="p-3 border">Tính năng & Thao tác</th>
                <th className="p-3 border text-center">Super Admin</th>
                <th className="p-3 border text-center">Sales</th>
                <th className="p-3 border text-center">Marketing</th>
                <th className="p-3 border text-center">Casting Director</th>
                <th className="p-3 border text-center">Developer</th>
              </tr>
            </thead>
            <tbody className="divide-y text-muted-foreground">
              <tr>
                <td className="p-3 border font-semibold text-foreground">Xem & Lọc Lead Pipeline</td>
                <td className="p-3 border text-center text-emerald-600 font-bold">✓ Toàn bộ</td>
                <td className="p-3 border text-center text-emerald-600 font-bold">✓</td>
                <td className="p-3 border text-center text-emerald-600 font-bold">✓</td>
                <td className="p-3 border text-center text-slate-400">—</td>
                <td className="p-3 border text-center text-blue-600 font-medium">Chỉ xem</td>
              </tr>
              <tr>
                <td className="p-3 border font-semibold text-foreground">Chuyển trạng thái & Convert to Talent</td>
                <td className="p-3 border text-center text-emerald-600 font-bold">✓</td>
                <td className="p-3 border text-center text-emerald-600 font-bold">✓</td>
                <td className="p-3 border text-center text-slate-400">—</td>
                <td className="p-3 border text-center text-slate-400">—</td>
                <td className="p-3 border text-center text-slate-400">—</td>
              </tr>
              <tr>
                <td className="p-3 border font-semibold text-foreground">Xóa Lead khỏi database</td>
                <td className="p-3 border text-center text-emerald-600 font-bold">✓</td>
                <td className="p-3 border text-center text-rose-500 font-semibold">✗ (Chống mất data)</td>
                <td className="p-3 border text-center text-slate-400">—</td>
                <td className="p-3 border text-center text-slate-400">—</td>
                <td className="p-3 border text-center text-slate-400">—</td>
              </tr>
              <tr>
                <td className="p-3 border font-semibold text-foreground">Lọc Diễn viên & Xem Hồ sơ 6 Phần</td>
                <td className="p-3 border text-center text-emerald-600 font-bold">✓</td>
                <td className="p-3 border text-center text-blue-600 font-medium">Chỉ xem</td>
                <td className="p-3 border text-center text-blue-600 font-medium">Chỉ xem</td>
                <td className="p-3 border text-center text-emerald-600 font-bold">✓ Toàn quyền</td>
                <td className="p-3 border text-center text-blue-600 font-medium">Chỉ xem</td>
              </tr>
              <tr>
                <td className="p-3 border font-semibold text-foreground">Xuất Comp-Card (A4 Sed Card) / In PDF</td>
                <td className="p-3 border text-center text-emerald-600 font-bold">✓</td>
                <td className="p-3 border text-center text-slate-400">—</td>
                <td className="p-3 border text-center text-slate-400">—</td>
                <td className="p-3 border text-center text-emerald-600 font-bold">✓ Toàn quyền</td>
                <td className="p-3 border text-center text-slate-400">—</td>
              </tr>
              <tr>
                <td className="p-3 border font-semibold text-foreground">Cấu hình Webhook & Log Meta Ads</td>
                <td className="p-3 border text-center text-emerald-600 font-bold">✓</td>
                <td className="p-3 border text-center text-slate-400">—</td>
                <td className="p-3 border text-center text-emerald-600 font-bold">✓ Giám sát</td>
                <td className="p-3 border text-center text-slate-400">—</td>
                <td className="p-3 border text-center text-emerald-600 font-bold">✓ Toàn quyền</td>
              </tr>
              <tr>
                <td className="p-3 border font-semibold text-foreground">Quản lý Tài khoản & Phân Quyền</td>
                <td className="p-3 border text-center text-emerald-600 font-bold">✓ Super Admin</td>
                <td className="p-3 border text-center text-slate-400">—</td>
                <td className="p-3 border text-center text-slate-400">—</td>
                <td className="p-3 border text-center text-slate-400">—</td>
                <td className="p-3 border text-center text-slate-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
              <div className="font-bold text-base">
                {editingMember ? 'Cập Nhật Tài Khoản Nhân Viên' : 'Thêm Nhân Viên Mới'}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-muted-foreground mb-1">
                  Họ và tên nhân viên <span className="text-brand-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Trần Thị Mai"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-muted-foreground mb-1">
                  Email đăng nhập <span className="text-brand-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="nhanvien@act.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-muted-foreground mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    placeholder="0912 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-muted-foreground mb-1">
                    Phòng ban
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none font-medium"
                  >
                    <option value="Phòng Tuyển Sinh">Phòng Tuyển Sinh</option>
                    <option value="Phòng Marketing">Phòng Marketing</option>
                    <option value="Bộ Phận Tuyển Vai">Bộ Phận Tuyển Vai</option>
                    <option value="Phòng Kỹ Thuật IT">Phòng Kỹ Thuật IT</option>
                    <option value="Ban Giám Đốc">Ban Giám Đốc</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-muted-foreground mb-1">
                    Vai trò (Role) <span className="text-brand-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none font-bold"
                  >
                    <option value="sales">Sales (Tư vấn)</option>
                    <option value="marketing">Marketing & Ads</option>
                    <option value="casting">Casting Director</option>
                    <option value="developer">Developer / IT</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-muted-foreground mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none font-medium"
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Tạm khóa</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-muted font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg shadow-sm"
                >
                  {editingMember ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
