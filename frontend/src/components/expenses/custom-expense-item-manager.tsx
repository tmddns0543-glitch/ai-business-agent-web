"use client";

import { useEffect, useState } from "react";

import { createExpenseCustomItemId } from "@/lib/expense/create-expense-custom-item-id";
import { getExpenseItemsForGroup } from "@/lib/expense/expense-item-catalog";
import {
  addExpenseCustomItem,
  getExpenseCustomItemsByGroup,
  setExpenseCustomItemEnabled,
} from "@/lib/storage/expense-custom-items-storage";
import type {
  CustomizableExpenseGroup,
  ExpenseCustomItem,
} from "@/types/expense";

const MAX_ITEM_NAME_LENGTH = 40;

type CustomExpenseItemManagerProps = {
  group: CustomizableExpenseGroup;
  groupLabel: string;
  onChanged: () => void;
};

function cleanItemName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeItemName(name: string) {
  return cleanItemName(name).toLocaleLowerCase("ko-KR");
}

export function CustomExpenseItemManager({
  group,
  groupLabel,
  onChanged,
}: CustomExpenseItemManagerProps) {
  const [items, setItems] = useState<ExpenseCustomItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isInactiveOpen, setIsInactiveOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  function reloadItems() {
    setItems(
      getExpenseCustomItemsByGroup(group, { includeDisabled: true }),
    );
  }

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage hydration runs only after the client mounts. */
  useEffect(() => {
    setItems(
      getExpenseCustomItemsByGroup(group, { includeDisabled: true }),
    );
  }, [group]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const activeItems = items.filter(({ enabled }) => enabled);
  const inactiveItems = items.filter(({ enabled }) => !enabled);

  function addItem() {
    const cleanedName = cleanItemName(name);

    if (!cleanedName) {
      setError("항목 이름을 입력해주세요.");
      return;
    }

    if (cleanedName.length > MAX_ITEM_NAME_LENGTH) {
      setError("항목 이름은 40자 이하로 입력해주세요.");
      return;
    }

    const normalizedName = normalizeItemName(cleanedName);
    const existingNames = getExpenseItemsForGroup(group, {
      includeDisabled: true,
    }).map(({ label }) => normalizeItemName(label));

    if (existingNames.includes(normalizedName)) {
      setError("이미 같은 이름의 항목이 있습니다.");
      return;
    }

    const now = new Date().toISOString();
    const saved = addExpenseCustomItem({
      id: createExpenseCustomItemId(group),
      group,
      name: cleanedName,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    if (!saved) {
      setError("비용 항목을 추가하지 못했습니다. 다시 시도해주세요.");
      return;
    }

    setName("");
    setIsAdding(false);
    setError(null);
    setMessage("새 비용 항목을 추가했습니다.");
    reloadItems();
    onChanged();
  }

  function changeEnabled(item: ExpenseCustomItem, enabled: boolean) {
    if (
      !enabled &&
      !window.confirm(
        "이 항목을 사용하지 않도록 설정할까요?\n과거 입력 내역은 그대로 유지됩니다.",
      )
    ) {
      return;
    }

    setPendingItemId(item.id);
    setError(null);
    setMessage(null);

    if (setExpenseCustomItemEnabled(item.id, enabled)) {
      reloadItems();
      onChanged();
      setMessage(
        enabled
          ? "비용 항목을 다시 사용하도록 설정했습니다."
          : "비용 항목을 사용하지 않도록 설정했습니다.",
      );
    } else {
      setError("비용 항목 설정을 변경하지 못했습니다. 다시 시도해주세요.");
    }

    setPendingItemId(null);
  }

  return (
    <section className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-800">
            사용자 추가 항목
          </h2>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
            {groupLabel}에 필요한 항목을 추가할 수 있어요.
          </p>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setMessage(null);
              setError(null);
            }}
            className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            항목 추가
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <label htmlFor={`custom-expense-item-${group}`}>
            <span className="text-xs font-bold text-slate-600">
              새 항목 이름
            </span>
            <input
              id={`custom-expense-item-${group}`}
              type="text"
              value={name}
              maxLength={MAX_ITEM_NAME_LENGTH + 1}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addItem();
                }

                if (event.key === "Escape") {
                  setIsAdding(false);
                  setName("");
                  setError(null);
                }
              }}
              placeholder="예: 음식물 처리비"
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={addItem}
              className="min-h-11 flex-1 rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setName("");
                setError(null);
              }}
              className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {activeItems.length > 0 && (
        <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 px-3">
          {activeItems.map((item) => (
            <div
              key={item.id}
              className="flex min-h-12 items-center justify-between gap-3 py-2"
            >
              <span className="min-w-0 truncate text-sm text-slate-700">
                {item.name}
              </span>
              <button
                type="button"
                onClick={() => changeEnabled(item, false)}
                disabled={pendingItemId === item.id}
                className="min-h-10 shrink-0 rounded-lg px-3 text-xs font-bold text-slate-500 transition hover:bg-slate-100 disabled:cursor-wait disabled:text-slate-300"
              >
                사용 안 함
              </button>
            </div>
          ))}
        </div>
      )}

      {inactiveItems.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsInactiveOpen((current) => !current)}
            className="flex min-h-11 w-full items-center justify-between rounded-xl bg-slate-50 px-3 text-sm font-semibold text-slate-600"
          >
            <span>사용하지 않는 항목 {inactiveItems.length}개</span>
            <span>{isInactiveOpen ? "접기" : "보기"}</span>
          </button>

          {isInactiveOpen && (
            <div className="mt-1 divide-y divide-slate-100 rounded-xl border border-slate-200 px-3">
              {inactiveItems.map((item) => (
                <div
                  key={item.id}
                  className="flex min-h-12 items-center justify-between gap-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm text-slate-500">
                    {item.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeEnabled(item, true)}
                    disabled={pendingItemId === item.id}
                    className="min-h-10 shrink-0 rounded-lg px-3 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-wait disabled:text-slate-300"
                  >
                    다시 사용
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs leading-5 text-rose-600">{error}</p>
      )}
      {message && (
        <p className="mt-2 text-xs leading-5 text-emerald-600">
          {message}
        </p>
      )}
    </section>
  );
}
