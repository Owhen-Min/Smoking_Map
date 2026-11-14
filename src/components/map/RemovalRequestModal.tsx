"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { anonymousMutation } from '@/lib/anonymousMutation';
import { REMOVAL_REASONS } from '@/lib/removalRequest';
import { SmokingArea } from '@/types/smoking';

export default function RemovalRequestModal({ area, onClose }: { area: SmokingArea; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      const response = await anonymousMutation(JSON.stringify({ area_id: area.id, reason, details }), 'POST', '/api/smoking-areas/removal-requests');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '요청을 저장하지 못했습니다.');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '연결을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return createPortal(
    <dialog ref={dialogRef} aria-labelledby="removal-title" onCancel={(event) => {
      if (submitting.current) event.preventDefault(); else onClose();
    }} className="m-auto w-[calc(100%_-_2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl bg-surface text-foreground p-5 backdrop:bg-black/60">
      <h2 id="removal-title" className="text-lg font-bold">흡연구역 제거 요청</h2>
      <p className="mt-2 text-sm font-medium break-words">{area.name || area.address || '선택한 흡연구역'}</p>
      {success ? (
        <div role="status" className="mt-4">
          <p>제거 요청이 접수되었습니다.</p>
          <p className="mt-2 text-sm text-foreground/70">관리자가 확인한 뒤 처리합니다. 검토 중에는 지도에 계속 표시됩니다.</p>
          <button autoFocus onClick={onClose} className="mt-5 w-full rounded-xl bg-primary text-primary-foreground py-3 font-bold">확인</button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-foreground/70">잘못된 정보인가요? 사유를 알려주시면 관리자가 검토합니다. 요청만으로 바로 삭제되지는 않습니다.</p>
          <label className="text-sm font-medium">제거 사유
            <select autoFocus required value={reason} disabled={saving} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-xl border border-foreground/20 bg-background p-3">
              <option value="" disabled>사유를 선택해 주세요</option>
              {Object.entries(REMOVAL_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">상세 설명 {reason === 'other' ? '(필수)' : '(선택)'}
            <textarea rows={3} maxLength={500} required={reason === 'other'} value={details} disabled={saving} onChange={(event) => setDetails(event.target.value)} placeholder="현장에서 확인한 내용을 적어 주세요." className="mt-2 w-full rounded-xl border border-foreground/20 bg-background p-3 resize-none" />
            <span className="block text-right text-xs text-foreground/60">{details.length}/500</span>
          </label>
          <p className="text-xs text-foreground/60">하루 5회까지 요청할 수 있습니다. 검토 중인 동일 장소 요청은 중복 접수되지 않습니다.</p>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={onClose} className="flex-1 rounded-xl bg-foreground/5 py-3 disabled:opacity-50">취소</button>
            <button type="submit" disabled={saving || !reason || (reason === 'other' && !details.trim())} className="flex-1 rounded-xl bg-primary text-primary-foreground py-3 font-bold disabled:opacity-50">{saving ? '접수 중…' : '제거 요청 보내기'}</button>
          </div>
        </form>
      )}
    </dialog>, document.body,
  );
}
