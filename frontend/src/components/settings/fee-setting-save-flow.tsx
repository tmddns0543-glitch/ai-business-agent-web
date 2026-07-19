"use client";

import { useState } from "react";

import { getTodayBusinessDate } from "@/lib/storage/business-day-storage";
import { getClosingStatusStorage } from "@/lib/storage/closing-status-by-business-day-storage";
import {
  getBusinessFeeSettings,
  getBusinessFeeSettingsStorage,
  getPlatformFeeSettings,
  hasStoredBusinessFeeSettings,
  resolvePlatformFeeSettings,
  savePlatformFeeSettings,
} from "@/lib/storage/fee-settings-storage";
import { formatBusinessDate, isValidBusinessDate, type BusinessDate } from "@/types/business-day";
import type { PlatformFeeSettings, SettlementPlatformId } from "@/types/settlement";

function normalizeSettings(settings: PlatformFeeSettings) {
  return Object.fromEntries(
    Object.entries(settings)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([channelId, setting]) => [channelId, setting]),
  );
}

export function platformFeeSettingsEqual(left: PlatformFeeSettings, right: PlatformFeeSettings) {
  return JSON.stringify(normalizeSettings(left)) === JSON.stringify(normalizeSettings(right));
}

function hasCompletedClosingOnOrAfter(effectiveFrom: BusinessDate) {
  return Object.entries(getClosingStatusStorage().days).some(
    ([businessDate, status]) =>
      businessDate >= effectiveFrom && status?.closingStatus === "completed",
  );
}

type SaveFlowOptions = {
  platformId: SettlementPlatformId;
  onSaved: () => void;
  onMessage: (message: string) => void;
};

export function useFeeSettingSaveFlow({ platformId, onSaved, onMessage }: SaveFlowOptions) {
  const [pending, setPending] = useState<PlatformFeeSettings | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState<BusinessDate>(getTodayBusinessDate());
  const [dateError, setDateError] = useState("");
  const [showClosingWarning, setShowClosingWarning] = useState(false);
  const [revision, setRevision] = useState(0);

  function finishSave(settings: PlatformFeeSettings, date?: BusinessDate) {
    if (!savePlatformFeeSettings(platformId, settings, date)) {
      onMessage("설정을 저장하지 못했습니다. 기존 설정은 유지됩니다.");
      return false;
    }
    setPending(null);
    setShowClosingWarning(false);
    setDateError("");
    setRevision((value) => value + 1);
    onSaved();
    return true;
  }

  function requestSave(settings: PlatformFeeSettings) {
    if (!hasStoredBusinessFeeSettings()) {
      finishSave(settings);
      return;
    }
    const current = getPlatformFeeSettings(getBusinessFeeSettings(), platformId);
    if (platformFeeSettingsEqual(current, settings)) {
      onMessage("변경된 내용이 없습니다.");
      return;
    }
    setEffectiveFrom(getTodayBusinessDate());
    setDateError("");
    setPending(settings);
  }

  function continueFromDateDialog() {
    if (!pending || !isValidBusinessDate(effectiveFrom)) {
      setDateError("유효한 적용 시작일을 선택해주세요.");
      return;
    }
    if (hasCompletedClosingOnOrAfter(effectiveFrom)) {
      setShowClosingWarning(true);
      return;
    }
    finishSave(pending, effectiveFrom);
  }

  const storage = getBusinessFeeSettingsStorage();
  const today = getTodayBusinessDate();
  const current = resolvePlatformFeeSettings(platformId, today);
  const future = storage.history[platformId].find((entry) => entry.effectiveFrom > today);

  const status = (
    <section key={revision} className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
      <p className="font-bold text-slate-800">현재 적용 중</p>
      <p className="mt-1">
        {current.source === "history" && current.effectiveFrom
          ? `${formatBusinessDate(current.effectiveFrom)}부터 적용된 설정`
          : "기존 설정"}
      </p>
      {future && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="font-bold text-indigo-700">적용 예정</p>
          <p className="mt-1">{formatBusinessDate(future.effectiveFrom)}부터 새 설정 적용</p>
        </div>
      )}
    </section>
  );

  const dialogs = pending ? (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="fee-effective-title" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        {showClosingWarning ? (
          <>
            <h2 id="fee-effective-title" className="text-lg font-bold text-slate-950">선택한 적용일 이후에 이미 마감된 매출이 있습니다.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">새 설정을 적용하면 해당 기간의 예상 정산금액과 경영성과가 다시 계산될 수 있습니다.</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">계속하시겠습니까?</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShowClosingWarning(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">돌아가기</button>
              <button type="button" onClick={() => finishSave(pending, effectiveFrom)} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white">계속 적용</button>
            </div>
          </>
        ) : (
          <>
            <h2 id="fee-effective-title" className="text-lg font-bold text-slate-950">수수료 설정이 변경되었습니다</h2>
            <p className="mt-2 text-sm text-slate-600">새 수수료율을 언제부터 적용할까요?</p>
            <label htmlFor="fee-effective-from" className="mt-5 block text-sm font-bold text-slate-700">적용 시작일</label>
            <input id="fee-effective-from" type="date" value={effectiveFrom} onChange={(event) => { setEffectiveFrom(event.target.value); setDateError(""); }} className="mt-2 h-13 w-full rounded-xl border border-slate-200 px-4 text-base font-semibold outline-none focus:border-indigo-400" />
            {dateError && <p className="mt-2 text-xs font-semibold text-rose-600">{dateError}</p>}
            <p className="mt-4 text-sm leading-6 text-slate-500">선택한 날짜부터 발생한 매출에 새 설정이 적용됩니다. 이전 날짜의 매출에는 기존 설정이 유지됩니다.</p>
            <p className="mt-2 text-xs font-semibold text-indigo-600">새 설정은 선택한 날짜부터 자동 적용됩니다.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setPending(null)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">취소</button>
              <button type="button" onClick={continueFromDateDialog} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white">이 날짜부터 적용</button>
            </div>
          </>
        )}
      </section>
    </div>
  ) : null;

  return { requestSave, status, dialogs };
}
