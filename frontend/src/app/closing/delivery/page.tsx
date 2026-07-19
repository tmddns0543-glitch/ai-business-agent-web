"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { calculateDeliveryAgencyBalanceThroughDate } from "@/lib/delivery-agency/calculate-delivery-agency-balance";
import { calculateDeliveryAgencySummary } from "@/lib/delivery-agency/calculate-delivery-agency-summary";
import { calculateDeliveryCharge } from "@/lib/delivery-agency/calculate-delivery-charge";
import { createDeliveryTransactionId } from "@/lib/delivery-agency/create-delivery-transaction-id";
import { getSelectedBusinessDate } from "@/lib/storage/business-day-storage";
import {
  setSectionConfirmed,
  setSectionUnconfirmed,
} from "@/lib/storage/closing-status-by-business-day-storage";
import {
  getAllDeliveryTransactions,
  getDeliveryAgencies,
  getDeliveryTransactionsByBusinessDate,
  replaceDeliveryTransactionsByBusinessDate,
} from "@/lib/storage/delivery-agency-storage";
import {
  formatBusinessDate,
  type BusinessDate,
} from "@/types/business-day";
import type {
  DeliveryAgency,
  DeliveryAgencyTransaction,
  DeliveryAgencyTransactionType,
} from "@/types/delivery-agency";

type AgencyInputValues = {
  paymentAmount: number;
  chargeFee: number;
  deliveryFee: number;
  cashCredit: number;
  monthlyFee: number;
};

type InputValues = Record<string, AgencyInputValues>;
type AgencyErrors = Record<string, string | undefined>;

function formatMoney(value: number) {
  return `${(Number.isFinite(value) ? value : 0).toLocaleString("ko-KR")}원`;
}

function createEmptyValues(): AgencyInputValues {
  return {
    paymentAmount: 0,
    chargeFee: 0,
    deliveryFee: 0,
    cashCredit: 0,
    monthlyFee: 0,
  };
}

function createCombinationKey(
  agencyId: string,
  type: DeliveryAgencyTransactionType,
) {
  return `${agencyId}::${type}`;
}

function createExistingMap(
  transactions: readonly DeliveryAgencyTransaction[],
) {
  const existing = new Map<
    string,
    { representative: DeliveryAgencyTransaction; amount: number; count: number }
  >();

  transactions.forEach((transaction) => {
    const key = createCombinationKey(transaction.agencyId, transaction.type);
    const current = existing.get(key);

    if (current) {
      existing.set(key, {
        ...current,
        amount: current.amount + transaction.amount,
        count: current.count + 1,
      });
    } else {
      existing.set(key, {
        representative: { ...transaction },
        amount: transaction.amount,
        count: 1,
      });
    }
  });

  return existing;
}

function createInputValues(
  agencies: readonly DeliveryAgency[],
  transactions: readonly DeliveryAgencyTransaction[],
): InputValues {
  const existing = createExistingMap(transactions);

  return Object.fromEntries(
    agencies.map((agency) => {
      const cashCharge =
        existing.get(createCombinationKey(agency.id, "cash-charge"))
          ?.amount ?? 0;
      const chargeFee =
        existing.get(createCombinationKey(agency.id, "charge-fee"))
          ?.amount ?? 0;

      return [
        agency.id,
        {
          paymentAmount:
            agency.chargeFeeMode === "deduct-from-payment"
              ? cashCharge + chargeFee
              : cashCharge,
          chargeFee,
          deliveryFee:
            existing.get(
              createCombinationKey(agency.id, "delivery-fee"),
            )?.amount ?? 0,
          cashCredit:
            existing.get(createCombinationKey(agency.id, "cash-credit"))
              ?.amount ?? 0,
          monthlyFee:
            existing.get(createCombinationKey(agency.id, "monthly-fee"))
              ?.amount ?? 0,
        },
      ];
    }),
  );
}

function createDraftTransactions(
  agency: DeliveryAgency,
  values: AgencyInputValues,
  businessDate: BusinessDate,
): DeliveryAgencyTransaction[] {
  const charge = calculateDeliveryCharge(
    values.paymentAmount,
    values.chargeFee,
    agency.chargeFeeMode,
  );
  const amounts: ReadonlyArray<
    readonly [DeliveryAgencyTransactionType, number]
  > = [
    ["cash-charge", charge.actualCashCharge],
    ["charge-fee", charge.chargeFee],
    ["delivery-fee", values.deliveryFee],
    ["cash-credit", values.cashCredit],
    ["monthly-fee", values.monthlyFee],
  ];

  return amounts.flatMap(([type, amount]) =>
    amount > 0
      ? [
          {
            id: `draft-${agency.id}-${type}`,
            businessDate,
            agencyId: agency.id,
            agencyName: agency.name,
            type,
            amount,
            createdAt: "",
            updatedAt: "",
          },
        ]
      : [],
  );
}

function getManagedSignature(
  transactions: readonly DeliveryAgencyTransaction[],
  activeAgencyIds: ReadonlySet<string>,
) {
  return transactions
    .filter((transaction) => activeAgencyIds.has(transaction.agencyId))
    .map((transaction) =>
      [transaction.agencyId, transaction.type, transaction.amount].join("|"),
    )
    .sort()
    .join("::");
}

type MoneyInputProps = {
  label: string;
  value: number;
  onChange: (value: string) => void;
};

function MoneyInput({ label, value, onChange }: MoneyInputProps) {
  return (
    <label className="flex min-h-13 items-center gap-3 border-t border-slate-100 py-2">
      <span className="min-w-0 flex-1 text-sm text-slate-600">{label}</span>
      <div className="flex w-40 shrink-0 items-center rounded-lg bg-slate-50 px-3 focus-within:ring-2 focus-within:ring-indigo-100">
        <input
          type="text"
          inputMode="numeric"
          value={value === 0 ? "" : value.toLocaleString("ko-KR")}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0"
          className="min-w-0 flex-1 bg-transparent py-3 text-right text-base font-bold text-slate-900 outline-none"
        />
        <span className="ml-1.5 text-xs text-slate-500">원</span>
      </div>
    </label>
  );
}

export default function DeliveryPage() {
  const router = useRouter();
  const [businessDate, setBusinessDate] = useState<BusinessDate | null>(null);
  const [agencies, setAgencies] = useState<DeliveryAgency[]>([]);
  const [transactions, setTransactions] = useState<DeliveryAgencyTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<DeliveryAgencyTransaction[]>([]);
  const [values, setValues] = useState<InputValues>({});
  const [errors, setErrors] = useState<AgencyErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage hydration runs after mount. */
  useEffect(() => {
    const selectedDate = getSelectedBusinessDate();
    const activeAgencies = getDeliveryAgencies().filter(({ enabled }) => enabled);
    const savedTransactions = getDeliveryTransactionsByBusinessDate(selectedDate);

    setBusinessDate(selectedDate);
    setAgencies(activeAgencies);
    setTransactions(savedTransactions);
    setAllTransactions(getAllDeliveryTransactions());
    setValues(createInputValues(activeAgencies, savedTransactions));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function updateValue(
    agencyId: string,
    field: keyof AgencyInputValues,
    rawValue: string,
  ) {
    if (rawValue.includes("-")) {
      setErrors((current) => ({
        ...current,
        [agencyId]: "금액은 0원 이상으로 입력해주세요.",
      }));
      return;
    }

    const digits = rawValue.replace(/\D/g, "");
    const amount = digits ? Number(digits) : 0;

    if (!Number.isFinite(amount)) {
      setErrors((current) => ({
        ...current,
        [agencyId]: "올바른 금액을 입력해주세요.",
      }));
      return;
    }

    setValues((current) => ({
      ...current,
      [agencyId]: {
        ...(current[agencyId] ?? createEmptyValues()),
        [field]: amount,
      },
    }));
    setErrors((current) => ({ ...current, [agencyId]: undefined }));
    setMessage(null);
  }

  const cardData = useMemo(
    () =>
      agencies.map((agency) => {
        const agencyValues = values[agency.id] ?? createEmptyValues();
        const charge = calculateDeliveryCharge(
          agencyValues.paymentAmount,
          agencyValues.chargeFee,
          agency.chargeFeeMode,
        );
        const draftTransactions = createDraftTransactions(
          agency,
          agencyValues,
          businessDate ?? "",
        );
        const currentDateSummary = calculateDeliveryAgencySummary(
          draftTransactions,
          0,
        );
        const transactionsThroughDate = [
          ...allTransactions.filter(
            (transaction) =>
              !(
                transaction.businessDate === businessDate &&
                transaction.agencyId === agency.id
              ),
          ),
          ...draftTransactions,
        ];
        const currentBalance = businessDate
          ? calculateDeliveryAgencyBalanceThroughDate(
              transactionsThroughDate,
              agency.id,
              businessDate,
              agency.initialCashBalance,
            )
          : agency.initialCashBalance;

        return {
          agency,
          values: agencyValues,
          charge,
          summary: currentDateSummary,
          currentBalance,
        };
      }),
    [agencies, allTransactions, businessDate, values],
  );

  function saveTransactions() {
    if (!businessDate || isSaving) {
      return;
    }

    const nextErrors: AgencyErrors = {};

    cardData.forEach(({ agency, charge }) => {
      if (!charge.valid) {
        nextErrors[agency.id] =
          "충전수수료는 충전한 금액보다 클 수 없습니다.";
      }
    });

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      setMessage(null);
      return;
    }

    const activeAgencyIds = new Set(agencies.map(({ id }) => id));
    const existing = createExistingMap(transactions);
    const now = new Date().toISOString();
    const nextManagedTransactions: DeliveryAgencyTransaction[] = [];

    cardData.forEach(({ agency, values: agencyValues, charge }) => {
      const amounts: ReadonlyArray<
        readonly [DeliveryAgencyTransactionType, number]
      > = [
        ["cash-charge", charge.actualCashCharge],
        ["charge-fee", charge.chargeFee],
        ["delivery-fee", agencyValues.deliveryFee],
        ["cash-credit", agencyValues.cashCredit],
        ["monthly-fee", agencyValues.monthlyFee],
      ];

      amounts.forEach(([type, amount]) => {
        if (amount <= 0) {
          return;
        }

        const saved = existing.get(createCombinationKey(agency.id, type));

        if (saved && saved.amount === amount && saved.count === 1) {
          nextManagedTransactions.push({ ...saved.representative });
          return;
        }

        nextManagedTransactions.push({
          id: saved?.representative.id ?? createDeliveryTransactionId(),
          businessDate,
          agencyId: agency.id,
          agencyName: agency.name,
          type,
          amount,
          createdAt: saved?.representative.createdAt ?? now,
          updatedAt: now,
        });
      });
    });

    const preservedTransactions = transactions
      .filter((transaction) => !activeAgencyIds.has(transaction.agencyId))
      .map((transaction) => ({ ...transaction }));
    const nextTransactions = [
      ...preservedTransactions,
      ...nextManagedTransactions,
    ];
    const currentSignature = getManagedSignature(
      transactions,
      activeAgencyIds,
    );
    const nextSignature = getManagedSignature(
      nextTransactions,
      activeAgencyIds,
    );

    if (currentSignature === nextSignature) {
      if (setSectionConfirmed(businessDate, "delivery")) {
        router.push("/closing");
      } else {
        setMessage("배달대행사 확인 상태를 저장하지 못했습니다. 다시 시도해주세요.");
      }
      return;
    }

    setIsSaving(true);
    setErrors({});
    setMessage(null);

    if (
      replaceDeliveryTransactionsByBusinessDate(
        businessDate,
        nextTransactions,
      )
    ) {
      if (
        setSectionUnconfirmed(businessDate, "delivery") &&
        setSectionConfirmed(businessDate, "delivery")
      ) {
        router.push("/closing");
      } else {
        setMessage("배달대행사 확인 상태를 저장하지 못했습니다. 다시 시도해주세요.");
      }
    } else {
      setMessage("배달대행사 내역을 저장하지 못했습니다. 다시 시도해주세요.");
    }

    setIsSaving(false);
  }

  function confirmNoDelivery() {
    if (!businessDate || isConfirming) {
      return;
    }

    if (getDeliveryTransactionsByBusinessDate(businessDate).length > 0) {
      setMessage("이미 입력된 배달대행사 내역이 있습니다.");
      return;
    }

    setIsConfirming(true);
    setMessage(null);

    if (setSectionConfirmed(businessDate, "delivery")) {
      router.push("/closing");
      return;
    }

    setIsConfirming(false);
    setMessage("배달대행사 없음 상태를 저장하지 못했습니다. 다시 시도해주세요.");
  }

  if (!businessDate) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">배달대행사 내역을 불러오는 중</p>
      </main>
    );
  }

  const hasDeliveryData =
    transactions.length > 0 ||
    cardData.some(({ summary }) => summary.transactionCount > 0);

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-3">
      <div className="mx-auto min-h-[calc(100vh-1.5rem)] max-w-md rounded-2xl bg-white px-4 pb-12 pt-4 shadow-sm">
        <header>
          <Link href="/closing" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-700 transition hover:bg-slate-100" aria-label="마감 화면으로 돌아가기">‹</Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">배달대행사</h1>
          <p className="mt-1 text-xs leading-5 text-slate-500">{formatBusinessDate(businessDate)} 영업일</p>
        </header>

        {agencies.length === 0 ? (
          <section className="mt-6 rounded-xl bg-slate-50 px-4 py-8 text-center">
            <h2 className="text-base font-bold text-slate-800">등록된 배달대행사가 없습니다.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">내 가게 설정에서 배달대행사를 먼저 등록해주세요.</p>
            <Link href="/more/store/delivery-agencies" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white">배달대행사 설정하기</Link>
          </section>
        ) : (
          <>
            <section className="mt-5 space-y-4">
              {cardData.map(({ agency, values: agencyValues, charge, summary, currentBalance }) => (
                <article key={agency.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h2 className="text-lg font-bold text-slate-900">{agency.name}</h2><p className="mt-1 text-xs text-slate-500">초기 캐시 {formatMoney(agency.initialCashBalance)}</p></div>
                    <div className="text-right"><p className="text-[11px] text-slate-400">현재 예상 캐시</p><p className="mt-0.5 text-lg font-bold text-indigo-600">{formatMoney(currentBalance)}</p></div>
                  </div>

                  <div className="mt-4">
                    <MoneyInput label="충전한 금액" value={agencyValues.paymentAmount} onChange={(value) => updateValue(agency.id, "paymentAmount", value)} />
                    <MoneyInput label="충전 수수료" value={agencyValues.chargeFee} onChange={(value) => updateValue(agency.id, "chargeFee", value)} />
                  </div>

                  <div className="mt-2 rounded-xl bg-indigo-50 p-3 text-xs">
                    <p className="leading-5 text-indigo-700">
                      {agency.chargeFeeMode === "deduct-from-payment" ? "충전한 금액에서 수수료를 차감한 금액이 캐시에 충전됩니다." : "충전한 금액 전액이 캐시에 충전되고 수수료가 별도로 결제됩니다."}
                    </p>
                    <div className="mt-2 space-y-1 border-t border-indigo-100 pt-2">
                      <div className="flex justify-between gap-3"><span className="text-slate-500">충전한 금액</span><span className="font-bold text-slate-700">{formatMoney(charge.paymentAmount)}</span></div>
                      {agency.chargeFeeMode === "additional-payment" && <div className="flex justify-between gap-3"><span className="text-slate-500">수수료 포함 외부 결제액</span><span className="font-bold text-slate-700">{formatMoney(charge.externalPaymentTotal)}</span></div>}
                      <div className="flex justify-between gap-3"><span className="text-slate-500">실제 충전 캐시</span><span className="font-bold text-indigo-700">{formatMoney(charge.actualCashCharge)}</span></div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <MoneyInput label="배달 대행비" value={agencyValues.deliveryFee} onChange={(value) => updateValue(agency.id, "deliveryFee", value)} />
                    <MoneyInput label="캐시 입금" value={agencyValues.cashCredit} onChange={(value) => updateValue(agency.id, "cashCredit", value)} />
                    <MoneyInput label="월정액 수수료" value={agencyValues.monthlyFee} onChange={(value) => updateValue(agency.id, "monthlyFee", value)} />
                  </div>

                  {errors[agency.id] && <p className="mt-3 text-xs leading-5 text-rose-600">{errors[agency.id]}</p>}

                  <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-xs">
                    <div className="flex justify-between gap-3"><span className="text-slate-500">실제 운영비용</span><span className="font-semibold text-slate-700">{formatMoney(summary.operatingExpenseTotal)}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">외부 현금 유출</span><span className="font-semibold text-slate-700">{formatMoney(summary.externalCashOutflowTotal)}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">예상 매입세액</span><span className="font-semibold text-slate-700">{formatMoney(summary.estimatedInputVatTotal)}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">캐시 잔액 변화</span><span className="font-semibold text-slate-700">{formatMoney(summary.cashBalanceChange)}</span></div>
                  </div>
                </article>
              ))}
            </section>

            {hasDeliveryData && (
              <button type="button" onClick={saveTransactions} disabled={isSaving} className="mt-5 min-h-14 w-full rounded-2xl bg-indigo-600 px-4 text-base font-bold text-white transition hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-wait disabled:bg-indigo-400">
                {isSaving ? "저장 중..." : "배달대행사 내역 저장"}
              </button>
            )}
          </>
        )}

        {message && (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {message}
          </p>
        )}

        {!hasDeliveryData && (
          <section className="mt-7 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={confirmNoDelivery}
              disabled={isConfirming}
              className="min-h-14 w-full rounded-2xl bg-slate-900 px-4 text-base font-bold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-wait disabled:bg-slate-500"
            >
              {isConfirming ? "확인 중..." : "오늘 배달대행사 사용 안함"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
