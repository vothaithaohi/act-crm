'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Phone, 
  Mail, 
  Calendar, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Edit3, 
  Plus, 
  Trash2, 
  Award, 
  DollarSign, 
  UserCheck, 
  Facebook, 
  Globe, 
  Share2, 
  Headphones, 
  GraduationCap, 
  Save, 
  Check, 
  PauseCircle, 
  PlayCircle,
  ExternalLink,
  Info
} from 'lucide-react';
import { 
  Lead, 
  LeadStatus, 
  LeadSource, 
  ACTCourseLevel, 
  EnrollmentStatus, 
  ACTCourseEnrollment, 
  AcademicProfile, 
  ACTTermMaster, 
  ACT_LEVEL_DETAILS, 
  ACT_TERMS_DATABASE, 
  LEAD_STATUS_DETAILS 
} from '@/lib/types/crm';
import { useCRM } from '@/lib/store/crm-context';
import { formatDate, formatPhoneNumber } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';

interface LeadDetailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

const ACT_LEVELS_ORDER: ACTCourseLevel[] = ['ACT1', 'ACT2', 'ACT3', 'ACT4'];

export function LeadDetailModal({ lead, isOpen, onClose }: LeadDetailModalProps) {
  const router = useRouter();
  const { 
    updateLead, 
    updateLeadStatus, 
    updateLeadAcademicProfile, 
    convertToTalent, 
    deleteLead, 
    talents, 
    teamMembers, 
    can 
  } = useCRM();

  // Local state for editable lead details
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [editingMilestone, setEditingMilestone] = useState<ACTCourseLevel | null>(null);
  const [selectedTermCode, setSelectedTermCode] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>('completed');
  const [instructorInput, setInstructorInput] = useState('');
  const [gradeInput, setGradeInput] = useState('');
  const [evaluationInput, setEvaluationInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        full_name: lead.full_name,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        status: lead.status,
        course_interest: lead.course_interest,
        notes: lead.notes,
        assigned_to: lead.assigned_to,
        tuition_fee: lead.tuition_fee,
        academic_profile: lead.academic_profile
      });
      setEditingMilestone(null);
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const academicProfile = formData.academic_profile || lead.academic_profile;
  const enrollments = academicProfile?.enrollments || [];
  const existingTalent = talents.find(t => t.lead_id === lead.id);

  // Helper to get enrollment by level
  const getEnrollmentForLevel = (level: ACTCourseLevel): ACTCourseEnrollment | undefined => {
    return enrollments.find(e => e.level === level);
  };

  // Status badge styling for enrollments
  const getEnrollmentBadge = (status?: EnrollmentStatus) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Đã hoàn thành',
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        };
      case 'studying':
        return {
          label: 'Đang theo học',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
          icon: <PlayCircle className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
        };
      case 'reserved':
        return {
          label: 'Bảo lưu',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
          icon: <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
        };
      default:
        return {
          label: 'Chưa học',
          badge: 'bg-slate-100 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400 border-slate-200',
          icon: <Clock className="w-3.5 h-3.5 text-slate-400" />
        };
    }
  };

  // Change lead pipeline status
  const handleStatusChange = async (newStatus: LeadStatus) => {
    setFormData(prev => ({ ...prev, status: newStatus }));
    await updateLeadStatus(lead.id, newStatus);
  };

  // Open inline editor for an ACT level milestone
  const handleOpenMilestoneEdit = (level: ACTCourseLevel) => {
    const current = getEnrollmentForLevel(level);
    const availableTerms = ACT_TERMS_DATABASE.filter(t => t.level === level);
    
    setEditingMilestone(level);
    if (current) {
      setSelectedTermCode(current.class_code || availableTerms[0]?.code || '');
      setEnrollmentStatus(current.status);
      setInstructorInput(current.instructor || 'Giảng viên ACT Academy');
      setGradeInput(current.grade || 'Đạt tiêu chuẩn');
      setEvaluationInput(current.evaluation || '');
    } else {
      setSelectedTermCode(availableTerms[0]?.code || '');
      setEnrollmentStatus('completed');
      setInstructorInput(availableTerms[0]?.instructor_default || 'Giảng viên ACT Academy');
      setGradeInput('Đạt');
      setEvaluationInput('');
    }
  };

  // Save milestone term enrollment
  const handleSaveMilestone = async () => {
    if (!editingMilestone) return;

    const termMeta = ACT_TERMS_DATABASE.find(t => t.code === selectedTermCode);
    const existing = getEnrollmentForLevel(editingMilestone);

    const newEnrollment: ACTCourseEnrollment = {
      id: existing?.id || crypto.randomUUID(),
      level: editingMilestone,
      class_code: selectedTermCode,
      term_name: termMeta ? `${termMeta.term_label} (${termMeta.time_display})` : selectedTermCode,
      start_date: termMeta?.start_date || existing?.start_date,
      end_date: termMeta?.end_date || existing?.end_date,
      status: enrollmentStatus,
      instructor: instructorInput || termMeta?.instructor_default || 'Giảng viên ACT Academy',
      grade: gradeInput,
      evaluation: evaluationInput || 'Hoàn thành chương trình đào tạo của khóa học.',
      certificate_issued: enrollmentStatus === 'completed'
    };

    // Filter out previous enrollment for this level, if any, and append updated one
    const updatedEnrollments = enrollments.filter(e => e.level !== editingMilestone).concat(newEnrollment);

    // Re-determine highest level
    const priority: Record<ACTCourseLevel, number> = { ACT4: 4, ACT3: 3, ACT2: 2, ACT1: 1, SSC: 0.5 };
    let highestLevel: ACTCourseLevel | null = null;
    let highestCode = '';
    let highestStatus: EnrollmentStatus = 'completed';

    updatedEnrollments.forEach(en => {
      if (!highestLevel || priority[en.level] > priority[highestLevel]) {
        highestLevel = en.level;
        highestCode = en.class_code;
        highestStatus = en.status;
      }
    });

    const updatedProfile: AcademicProfile = {
      highest_act_level: highestLevel,
      highest_class_code: highestCode,
      highest_level_status: highestStatus,
      enrollments: updatedEnrollments,
      total_courses_count: updatedEnrollments.length,
      specialization_notes: `Học viên đạt cấp độ đào tạo ${highestLevel || ''} (${highestCode}) tại ACT Academy.`
    };

    setFormData(prev => ({ ...prev, academic_profile: updatedProfile }));
    await updateLeadAcademicProfile(lead.id, updatedProfile);
    setEditingMilestone(null);
  };

  // Remove enrollment from a level
  const handleRemoveMilestone = async (level: ACTCourseLevel) => {
    if (!confirm(`Bạn có chắc muốn xóa ghi nhận lớp ${level} của học viên này?`)) return;

    const updatedEnrollments = enrollments.filter(e => e.level !== level);
    const priority: Record<ACTCourseLevel, number> = { ACT4: 4, ACT3: 3, ACT2: 2, ACT1: 1, SSC: 0.5 };
    let highestLevel: ACTCourseLevel | null = null;
    let highestCode = '';
    let highestStatus: EnrollmentStatus = 'completed';

    updatedEnrollments.forEach(en => {
      if (!highestLevel || priority[en.level] > priority[highestLevel]) {
        highestLevel = en.level;
        highestCode = en.class_code;
        highestStatus = en.status;
      }
    });

    const updatedProfile: AcademicProfile = {
      highest_act_level: highestLevel,
      highest_class_code: highestCode,
      highest_level_status: highestStatus,
      enrollments: updatedEnrollments,
      total_courses_count: updatedEnrollments.length,
      specialization_notes: highestLevel ? `Học viên đạt cấp độ đào tạo ${highestLevel} tại ACT Academy.` : ''
    };

    setFormData(prev => ({ ...prev, academic_profile: updatedProfile }));
    await updateLeadAcademicProfile(lead.id, updatedProfile);
    setEditingMilestone(null);
  };

  // Save overall lead edits
  const handleSaveLead = async () => {
    setIsSaving(true);
    try {
      await updateLead({
        ...lead,
        ...formData
      } as Lead);
    } finally {
      setIsSaving(false);
    }
  };

  // Convert to talent casting profile
  const handleConvertToTalent = async () => {
    try {
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      const talentId = await convertToTalent(lead.id);
      onClose();
      setTimeout(() => {
        router.push(`/talents/${talentId}`);
      }, 400);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi chuyển đổi lead thành diễn viên casting');
    }
  };

  const renderSourceIcon = (source?: LeadSource) => {
    switch (source) {
      case 'meta_ads':
        return <Facebook className="w-3.5 h-3.5 text-blue-600" />;
      case 'website_form':
        return <Globe className="w-3.5 h-3.5 text-purple-600" />;
      case 'referral':
        return <Share2 className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Headphones className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden text-foreground">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b bg-muted/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold text-base border border-brand-500/20">
              {lead.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-lg text-foreground tracking-tight">
                  {lead.full_name}
                </h2>
                
                {/* Highest ACT Level Badge */}
                {academicProfile?.highest_act_level ? (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs ${ACT_LEVEL_DETAILS[academicProfile.highest_act_level]?.badgeClass || 'bg-amber-100 text-amber-800'}`}>
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Lớp cao nhất: {academicProfile.highest_act_level}</span>
                    {academicProfile.highest_class_code && (
                      <span className="opacity-80">({academicProfile.highest_class_code})</span>
                    )}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border">
                    Chưa xếp lớp ACT
                  </span>
                )}

                {existingTalent && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200">
                    <Sparkles className="w-3 h-3 text-rose-600" />
                    Đã là Diễn viên Casting
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-brand-500" />
                  {lead.phone ? formatPhoneNumber(lead.phone) : <span className="italic text-muted-foreground/60">Chưa cập nhật SĐT</span>}
                </span>
                {lead.email && (
                  <span className="flex items-center gap-1 hidden sm:flex">
                    <Mail className="w-3 h-3 text-muted-foreground" />
                    {lead.email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  Tiếp nhận: {formatDate(lead.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* 1. SEVEN-STAGE PIPELINE STATUS SWITCHER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>Trạng thái phễu tuyển sinh (Pipeline 7 bước chuẩn)</span>
              </label>
              <span className="text-xs font-semibold text-brand-600">
                {LEAD_STATUS_DETAILS[formData.status as LeadStatus]?.label || formData.status}
              </span>
            </div>

            {/* Stepper Bar of 7 Stages */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 p-1.5 bg-muted/50 rounded-xl border">
              {(Object.keys(LEAD_STATUS_DETAILS) as LeadStatus[]).map((st, idx) => {
                const isCurrent = formData.status === st;
                const details = LEAD_STATUS_DETAILS[st];

                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg text-center transition-all ${
                      isCurrent 
                        ? 'bg-card text-brand-600 font-bold shadow-sm border border-brand-500/30' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                    }`}
                  >
                    <span className="text-[10px] font-mono text-muted-foreground">
                      0{idx + 1}
                    </span>
                    <span className="text-xs font-semibold line-clamp-1">
                      {details.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground italic px-1">
              💡 {LEAD_STATUS_DETAILS[formData.status as LeadStatus]?.desc}
            </p>
          </div>

          {/* 2. HORIZONTAL TIMELINE: ACT 1 -> ACT 2 -> ACT 3 -> ACT 4 */}
          <div className="p-5 rounded-2xl border bg-gradient-to-br from-slate-50 to-muted/30 dark:from-slate-900/40 dark:to-muted/10 space-y-4 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">
                  Lộ trình học tập thực tế (ACT 1 ➔ ACT 2 ➔ ACT 3 ➔ ACT 4)
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">
                Tra cứu từ Master Schedule ({ACT_TERMS_DATABASE.length} Term thực tế)
              </span>
            </div>

            {/* Horizontal Timeline Stepper Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
              {ACT_LEVELS_ORDER.map((level, idx) => {
                const enrollment = getEnrollmentForLevel(level);
                const isEnrolled = !!enrollment;
                const statusMeta = getEnrollmentBadge(enrollment?.status);
                const details = ACT_LEVEL_DETAILS[level];

                // Lookup Term info in Master Database if class code exists
                const masterTerm = ACT_TERMS_DATABASE.find(t => t.code === enrollment?.class_code);
                const displayTime = masterTerm?.time_display || (enrollment?.start_date ? `${enrollment.start_date} - ${enrollment.end_date}` : 'Chưa có lịch');

                return (
                  <div
                    key={level}
                    className={`relative p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                      isEnrolled
                        ? 'bg-card shadow-sm border-brand-500/30'
                        : 'bg-card/40 border-dashed border-border opacity-75 hover:opacity-100'
                    }`}
                  >
                    {/* Header: Level Label & Status Badge */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-extrabold ${details.badgeClass}`}>
                            {level}
                          </span>
                          <span className="text-[11px] font-bold text-foreground">
                            {details.stage}
                          </span>
                        </div>
                        {idx < 3 && (
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 hidden md:block" />
                        )}
                      </div>

                      {/* Status indicator */}
                      <div className="flex items-center gap-1.5">
                        {statusMeta.icon}
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${statusMeta.badge}`}>
                          {statusMeta.label}
                        </span>
                      </div>

                      {/* Term & Time Schedule */}
                      <div className="pt-2 border-t text-xs space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                          <span>Kỳ / Term:</span>
                          <span className="font-bold text-foreground">
                            {enrollment?.class_code || 'Chưa gán Term'}
                          </span>
                        </div>
                        <div className="flex items-start justify-between text-[11px] text-muted-foreground">
                          <span className="shrink-0">Thời gian:</span>
                          <span className="font-medium text-foreground text-right line-clamp-1" title={displayTime}>
                            {displayTime}
                          </span>
                        </div>
                        {enrollment?.instructor && (
                          <div className="flex items-start justify-between text-[11px] text-muted-foreground">
                            <span className="shrink-0">Giảng viên:</span>
                            <span className="font-medium text-foreground text-right line-clamp-1">
                              {enrollment.instructor}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action: Edit / Assign Term */}
                    <div className="pt-3 mt-3 border-t flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleOpenMilestoneEdit(level)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isEnrolled ? 'Sửa thông tin' : 'Gán Term học'}</span>
                      </button>

                      {isEnrolled && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMilestone(level)}
                          className="text-muted-foreground hover:text-rose-600 p-1 rounded transition-colors"
                          title="Xóa khóa học này"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Inline Milestone Editor Form (When "Gán Term / Sửa" is clicked) */}
            {editingMilestone && (
              <div className="p-4 rounded-xl bg-card border border-brand-500/40 shadow-sm animate-in fade-in duration-150 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-brand-600">
                      Cập nhật khóa học {editingMilestone} ({ACT_LEVEL_DETAILS[editingMilestone].fullName})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingMilestone(null)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    Hủy bỏ
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Select Term from ACT_TERMS_DATABASE */}
                  <div>
                    <label className="block font-semibold mb-1 text-muted-foreground">
                      Chọn Term từ Master Database ({ACT_TERMS_DATABASE.filter(t => t.level === editingMilestone).length} khóa có sẵn)
                    </label>
                    <select
                      value={selectedTermCode}
                      onChange={(e) => {
                        setSelectedTermCode(e.target.value);
                        const match = ACT_TERMS_DATABASE.find(t => t.code === e.target.value);
                        if (match?.instructor_default) {
                          setInstructorInput(match.instructor_default);
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border bg-background font-medium"
                    >
                      {ACT_TERMS_DATABASE.filter(t => t.level === editingMilestone).map(term => (
                        <option key={term.code} value={term.code}>
                          {term.code} - {term.term_label} ({term.time_display})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block font-semibold mb-1 text-muted-foreground">
                      Trạng thái hoàn thành
                    </label>
                    <select
                      value={enrollmentStatus}
                      onChange={(e) => setEnrollmentStatus(e.target.value as EnrollmentStatus)}
                      className="w-full px-3 py-1.5 rounded-lg border bg-background font-medium"
                    >
                      <option value="completed">Đã hoàn thành / Tốt nghiệp</option>
                      <option value="studying">Đang theo học (Active)</option>
                      <option value="reserved">Bảo lưu kỳ học</option>
                      <option value="cancelled">Hủy đăng ký</option>
                    </select>
                  </div>

                  {/* Instructor */}
                  <div>
                    <label className="block font-semibold mb-1 text-muted-foreground">
                      Giảng viên phụ trách
                    </label>
                    <input
                      type="text"
                      value={instructorInput}
                      onChange={(e) => setInstructorInput(e.target.value)}
                      placeholder="VD: Đạo diễn Vũ Trần, GV ACT"
                      className="w-full px-3 py-1.5 rounded-lg border bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1 text-muted-foreground">
                      Đánh giá / Xếp loại
                    </label>
                    <input
                      type="text"
                      value={gradeInput}
                      onChange={(e) => setGradeInput(e.target.value)}
                      placeholder="VD: Xuất sắc, Đạt, Khá"
                      className="w-full px-3 py-1.5 rounded-lg border bg-background"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1 text-muted-foreground">
                      Nhận xét chuyên môn từ giảng viên
                    </label>
                    <input
                      type="text"
                      value={evaluationInput}
                      onChange={(e) => setEvaluationInput(e.target.value)}
                      placeholder="VD: Làm chủ tiếng nói sân khấu tốt, biểu cảm vi mô sâu sắc..."
                      className="w-full px-3 py-1.5 rounded-lg border bg-background"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingMilestone(null)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-muted-foreground hover:bg-muted"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMilestone}
                    className="px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu vào lộ trình học viên</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. STUDENT ADMISSION INFORMATION & EDITABLE DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left Column: Personal & Contact */}
            <div className="p-4 rounded-xl border bg-card space-y-3 text-xs">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>Thông tin cá nhân & Liên hệ</span>
              </h4>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  Họ và tên học viên
                </label>
                <input
                  type="text"
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border bg-background font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border bg-background font-medium"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border bg-background font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  Khóa học quan tâm ban đầu
                </label>
                <input
                  type="text"
                  value={formData.course_interest || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, course_interest: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border bg-background font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  Ghi chú tuyển sinh & Hồ sơ học tập gốc
                </label>
                <textarea
                  rows={3}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border bg-background font-medium"
                />
              </div>
            </div>

            {/* Right Column: Source, Meta Ads & Sales Management */}
            <div className="p-4 rounded-xl border bg-card space-y-3 text-xs">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>Nguồn Lead & Phân công chăm sóc</span>
              </h4>

              {/* Source Details */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Nguồn tiếp nhận
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/40 font-semibold">
                    {renderSourceIcon(lead.source)}
                    <span className="capitalize">{lead.source.replace('_', ' ')}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Học phí dự kiến / ghi nhận
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      step="500000"
                      value={formData.tuition_fee || 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, tuition_fee: Number(e.target.value) }))}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border bg-background font-bold text-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Meta Ads Campaign Tracking Info (If from Meta Ads) */}
              {lead.source === 'meta_ads' && (
                <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 space-y-1.5 text-[11px]">
                  <div className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <Facebook className="w-3 h-3" />
                    <span>Dữ liệu chiến dịch Meta Ads:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-muted-foreground">
                    <div>Campaign: <span className="font-medium text-foreground">{lead.campaign_name || 'N/A'}</span></div>
                    <div>Adset: <span className="font-medium text-foreground">{lead.adset_name || 'N/A'}</span></div>
                    <div>Ad Name: <span className="font-medium text-foreground">{lead.ad_name || 'N/A'}</span></div>
                    <div>Lead ID: <span className="font-mono text-foreground">{lead.meta_lead_id || 'N/A'}</span></div>
                  </div>
                </div>
              )}

              {/* Assigned Consultant */}
              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  Chuyên viên tư vấn phụ trách (Sales)
                </label>
                <select
                  value={formData.assigned_to || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border bg-background font-medium"
                >
                  <option value="">-- Chưa phân công --</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.department || m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Concept Separation Notice */}
              <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-800 dark:text-amber-300">
                  <Info className="w-3.5 h-3.5" />
                  <span>Quy tắc dữ liệu ACT Academy:</span>
                </div>
                <p>
                  <strong>Lead</strong> là học viên tuyển sinh & đào tạo theo các cấp độ ACT 1 ➔ ACT 4.
                  Hồ sơ <strong>Talent</strong> dành riêng cho casting diễn viên chuyên nghiệp (số đo 3 vòng, comp-card, phân vai điện ảnh).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Footer */}
        <div className="px-6 py-3.5 border-t bg-muted/40 flex items-center justify-between shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {can('leads:delete') && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Bạn có chắc muốn xóa lead ${lead.full_name}?`)) {
                    deleteLead(lead.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa lead</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Convert to Talent Casting Button */}
            {can('leads:convert') && !existingTalent && (
              <button
                type="button"
                onClick={handleConvertToTalent}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                title="Tạo hồ sơ Casting Diễn viên và giữ nguyên lộ trình đào tạo ACT"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Chuyển thành Talent Casting (Diễn viên)</span>
              </button>
            )}

            {existingTalent && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/talents/${existingTalent.id}`);
                }}
                className="px-3.5 py-1.5 rounded-xl border bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 hover:bg-rose-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở Hồ Sơ Diễn Viên</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveLead}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/30 flex items-center gap-1.5 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
