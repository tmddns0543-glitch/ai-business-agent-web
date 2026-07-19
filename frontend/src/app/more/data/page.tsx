"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type MouseEvent } from "react";

import {
  createAppBackupDocument,
  downloadAppBackup,
  hasBackupData,
  restoreAppBackup,
  validateAppBackupText,
  type AppBackupDocument,
} from "@/lib/storage/app-data-backup";

const MAX_BACKUP_FILE_SIZE = 10 * 1024 * 1024;

export default function DataManagementPage() {
  const router = useRouter();
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedBackup, setSelectedBackup] =
    useState<AppBackupDocument | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  function clearSelectedBackup() {
    setSelectedFileName(null);
    setSelectedBackup(null);
  }

  function backupCurrentData() {
    setError(null);
    setMessage(null);
    const backup = createAppBackupDocument();

    if (!backup || !hasBackupData(backup)) {
      setError("백업할 데이터가 없습니다.");
      return;
    }

    if (!downloadAppBackup(backup)) {
      setError("백업 파일을 저장하지 못했습니다. 다시 시도해주세요.");
      return;
    }

    setMessage("데이터 백업 파일을 저장했습니다.");
  }

  async function selectBackupFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    clearSelectedBackup();
    setError(null);
    setMessage(null);

    if (!file) {
      return;
    }

    if (!file.name.toLocaleLowerCase("en-US").endsWith(".json")) {
      setError(".json 백업 파일만 선택할 수 있습니다.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_BACKUP_FILE_SIZE) {
      setError("백업 파일은 10MB 이하만 사용할 수 있습니다.");
      event.target.value = "";
      return;
    }

    setIsReadingFile(true);

    try {
      const result = validateAppBackupText(await file.text());

      if (!result.valid) {
        setError(result.error);
        event.target.value = "";
        return;
      }

      setSelectedFileName(file.name);
      setSelectedBackup(result.backup);
      setMessage("복원 가능한 백업 파일입니다.");
    } catch {
      setError("백업 파일을 읽지 못했습니다.");
      event.target.value = "";
    } finally {
      setIsReadingFile(false);
    }
  }

  function openRestoreDialog() {
    if (!selectedBackup || isReadingFile || isRestoring) {
      setError("복원할 백업 파일을 다시 선택해 주세요.");
      return;
    }

    setError(null);
    setIsRestoreDialogOpen(true);
  }

  function restoreSelectedBackup(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isRestoring) {
      return;
    }

    if (!selectedBackup) {
      setError("복원할 백업 파일을 다시 선택해 주세요.");
      setIsRestoreDialogOpen(false);
      return;
    }

    setIsRestoring(true);
    setError(null);
    setMessage(null);

    const safetyBackup = createAppBackupDocument();

    if (
      !safetyBackup ||
      !downloadAppBackup(
        safetyBackup,
        "ai-business-agent-before-restore",
      )
    ) {
      setError("현재 데이터의 안전 백업을 저장하지 못해 복원을 중단했습니다.");
      setIsRestoring(false);
      return;
    }

    if (!restoreAppBackup(selectedBackup)) {
      setError("데이터를 복원하지 못했습니다. 기존 데이터를 복구했습니다.");
      setIsRestoring(false);
      return;
    }

    setIsRestoreDialogOpen(false);
    setMessage("데이터를 복원했습니다.");
    setIsRestoring(false);
    window.setTimeout(() => router.push("/"), 700);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-md rounded-[2rem] bg-white px-5 pb-12 pt-6 shadow-sm">
        <header>
          <Link
            href="/more"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100"
            aria-label="더보기로 돌아가기"
          >
            ‹
          </Link>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
            데이터 관리
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            브라우저에 저장된 앱 데이터를 안전하게 보관하세요.
          </p>
        </header>

        <section className="mt-7 rounded-2xl border border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-950">데이터 백업</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            현재 브라우저에 저장된 매출, 비용, 마감 및 설정 데이터를 JSON 파일로 저장합니다.
          </p>
          <button
            type="button"
            onClick={backupCurrentData}
            className="mt-5 min-h-14 w-full rounded-2xl bg-indigo-600 px-4 text-base font-bold text-white transition hover:bg-indigo-700 active:scale-[0.99]"
          >
            데이터 백업하기
          </button>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-950">데이터 복원</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            이 서비스에서 생성한 JSON 백업 파일을 불러옵니다.
          </p>
          <label
            htmlFor="restore-backup-file"
            className="mt-5 block text-sm font-bold text-slate-700"
          >
            백업 파일
          </label>
          <input
            id="restore-backup-file"
            type="file"
            accept=".json,application/json"
            onChange={selectBackupFile}
            disabled={isReadingFile || isRestoring}
            className="mt-2 block w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-slate-700"
          />
          {selectedFileName && (
            <p className="mt-2 break-all text-xs text-slate-500">
              선택됨: {selectedFileName}
            </p>
          )}
          <button
            type="button"
            onClick={openRestoreDialog}
            disabled={!selectedBackup || isReadingFile || isRestoring}
            className="mt-5 min-h-14 w-full rounded-2xl bg-slate-900 px-4 text-base font-bold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {isReadingFile ? "파일 확인 중..." : "데이터 복원하기"}
          </button>
        </section>

        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </p>
        )}
      </div>

      {isRestoreDialogOpen && selectedBackup && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-6 sm:items-center"
          role="presentation"
          onClick={(event) => event.stopPropagation()}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-dialog-title"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="restore-dialog-title" className="text-lg font-bold text-slate-950">
              백업 데이터를 복원하시겠습니까?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              현재 브라우저에 저장된 앱 데이터가 선택한 백업 데이터로 교체됩니다.
              <br />
              <br />
              복원을 시작하면 현재 데이터를 안전 백업 파일로 먼저 저장합니다.
              브라우저 설정에 따라 파일 저장 위치를 선택하는 창이 표시될 수 있습니다.
              안전 백업이 저장된 뒤 선택한 데이터가 복원됩니다.
            </p>
            <p className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-xs font-semibold leading-5 text-indigo-700">
              표시되는 파일 창은 복원 파일을 다시 선택하는 창이 아니라 현재 데이터를
              보호하기 위한 안전 백업 저장창입니다.
            </p>
            {error && (
              <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                {error}
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setIsRestoreDialogOpen(false);
                }}
                disabled={isRestoring}
                className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 disabled:cursor-wait"
              >
                취소
              </button>
              <button
                type="button"
                onClick={restoreSelectedBackup}
                disabled={isRestoring}
                className="min-h-12 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white disabled:cursor-wait disabled:bg-rose-400"
              >
                {isRestoring
                  ? "안전 백업 및 복원 중..."
                  : "안전 백업 후 복원"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
