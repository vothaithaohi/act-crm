-- Tạm thời: diễn viên ứng tuyển tự vào Shortlist. Chuyển các đơn "Mới ứng tuyển" hiện có sang Shortlist.
-- (Đơn mới do code tự đặt Shortlist; muốn tắt: đổi NEW_APPLICATION_STATUS trong src/lib/projects/types.ts.)
UPDATE public.project_applications SET status = 'shortlisted' WHERE status = 'applied';
