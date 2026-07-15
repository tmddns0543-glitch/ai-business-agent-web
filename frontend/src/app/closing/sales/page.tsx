"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BaeminSales = {
  prepaid: number;
  card: number;
  cash: number;
  baeminOne: number;
  baeminOneOrders: number;
};

type CoupangEatsSales = {
  sales: number;
  orders: number;
};

type YogiyoSales = {
  prepaid: number;
  card: number;
  cash: number;
  yogiDelivery: number;
  yogiDeliveryOrders: number;
};

type DdangyoSales = {
  prepaid: number;
};

type GeneralSales = {
  card: number;
  cash: number;
  bankTransfer: number;
};

const EMPTY_BAEMIN: BaeminSales = {
  prepaid: 0,
  card: 0,
  cash: 0,
  baeminOne: 0,
  baeminOneOrders: 0,
};

const EMPTY_COUPANG_EATS: CoupangEatsSales = {
  sales: 0,
  orders: 0,
};

const EMPTY_YOGIYO: YogiyoSales = {
  prepaid: 0,
  card: 0,
  cash: 0,
  yogiDelivery: 0,
  yogiDeliveryOrders: 0,
};

const EMPTY_DDANGYO: DdangyoSales = {
  prepaid: 0,
};

const EMPTY_GENERAL: GeneralSales = {
  card: 0,
  cash: 0,
  bankTransfer: 0,
};

function formatMoney(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

type PlatformCardProps = {
  name: string;
  description: string;
  amount: number;
  status: "completed" | "not-started";
  href?: string;
};

function PlatformCard({
  name,
  description,
  amount,
  status,
  href,
}: PlatformCardProps) {
  const isCompleted = status === "completed";

  const content = (
    <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
          isCompleted
            ? "bg-emerald-50 text-emerald-600"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {name.slice(0, 1)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="truncate text-base font-bold text-slate-900">
            {name}
          </h2>

          <span
            className={`shrink-0 text-xs font-semibold ${
              isCompleted ? "text-emerald-600" : "text-slate-400"
            }`}
          >
            {isCompleted ? "입력 완료" : "미입력"}
          </span>
        </div>

        <p className="mt-1 text-sm text-slate-500">{description}</p>

        {isCompleted && (
          <p className="mt-2 font-bold text-slate-900">
            {formatMoney(amount)}
          </p>
        )}
      </div>

      {href && (
        <span className="shrink-0 text-xl text-slate-300" aria-hidden="true">
          ›
        </span>
      )}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

export default function SalesPage() {
  const [baemin, setBaemin] = 
    useState<BaeminSales>(EMPTY_BAEMIN);
  
  const [coupangEats, setCoupangEats] =
    useState<CoupangEatsSales>(EMPTY_COUPANG_EATS);
  
  const [yogiyo, setYogiyo] =
    useState<YogiyoSales>(EMPTY_YOGIYO);
  
  const [ddangyo, setDdangyo] =
    useState<DdangyoSales>(EMPTY_DDANGYO);

  const [general, setGeneral] =
    useState<GeneralSales>(EMPTY_GENERAL);

  const [isLoaded, setIsLoaded] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage hydration runs only after the client mounts. */
  useEffect(() => {
    const savedBaemin = window.localStorage.getItem("sales-baemin");

    if (savedBaemin) {
      try {
        const parsedBaemin = JSON.parse(savedBaemin) as BaeminSales;
        setBaemin(parsedBaemin);
      } catch {
        window.localStorage.removeItem("sales-baemin");
      }
    }

    const savedCoupangEats = window.localStorage.getItem(
      "sales-coupang-eats",
    );

    if (savedCoupangEats) {
      try {
        const parsedCoupangEats = JSON.parse(
          savedCoupangEats,
        ) as CoupangEatsSales;

        setCoupangEats(parsedCoupangEats);
      } catch {
        window.localStorage.removeItem("sales-coupang-eats");
      }
    }

    const savedYogiyo = window.localStorage.getItem("sales-yogiyo");

    if (savedYogiyo) {
      try {
        const parsedYogiyo = JSON.parse(savedYogiyo) as YogiyoSales;
        setYogiyo(parsedYogiyo);
      } catch {
        window.localStorage.removeItem("sales-yogiyo");
      }
    }

    const savedDdangyo =
      window.localStorage.getItem("sales-ddangyo");

    if (savedDdangyo) {
      try {
        const parsedDdangyo =
          JSON.parse(savedDdangyo) as DdangyoSales;

        setDdangyo(parsedDdangyo);
      } catch {
        window.localStorage.removeItem("sales-ddangyo");
      }
    }

    const savedGeneral =
      window.localStorage.getItem("sales-general");

    if (savedGeneral) {
      try {
        const parsedGeneral =
          JSON.parse(savedGeneral) as GeneralSales;

        setGeneral(parsedGeneral);
      } catch {
        window.localStorage.removeItem("sales-general");
      }
    }

  setIsLoaded(true);
}, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const baeminTotal = useMemo(() => {
    return (
      baemin.prepaid +
      baemin.card +
      baemin.cash +
      baemin.baeminOne
    );
  }, [baemin]);

  const coupangEatsTotal = Number(coupangEats.sales ?? 0);

  const yogiyoTotal = useMemo(() => {
    return (
      yogiyo.prepaid +
      yogiyo.card +
      yogiyo.cash +
      yogiyo.yogiDelivery
    );
  }, [yogiyo]);

  const ddangyoTotal =
    ddangyo.prepaid;

  const generalTotal =
    Number(general.card ?? 0) +
    Number(general.cash ?? 0) +
    Number(general.bankTransfer ?? 0);

  const totalSales =
    baeminTotal +
    coupangEatsTotal +
    yogiyoTotal +
    ddangyoTotal +
    generalTotal;

  const isBaeminCompleted = baeminTotal > 0;
  const isCoupangEatsCompleted = coupangEatsTotal > 0;
  const isYogiyoCompleted = yogiyoTotal > 0;
  const isDdangyoCompleted = ddangyoTotal > 0;
  const isGeneralCompleted = generalTotal > 0;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-md rounded-[2rem] bg-white px-5 pb-28 pt-6 shadow-sm">
        <header>
          <Link
            href="/closing"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100"
            aria-label="마감 화면으로 돌아가기"
          >
            ‹
          </Link>

          <p className="mt-5 text-sm font-medium text-slate-500">
            2026년 7월 12일
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            매출
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            입력할 플랫폼을 선택해주세요.
          </p>
        </header>

        <section className="mt-7 rounded-3xl bg-indigo-50 p-5">
          <p className="text-sm font-medium text-indigo-500">
            현재 입력된 총매출
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-indigo-700">
            {isLoaded ? formatMoney(totalSales) : "불러오는 중"}
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <PlatformCard
            name="배달의민족"
            description="선결제 · 카드 · 현금 · 배민원"
            amount={baeminTotal}
            status={isBaeminCompleted ? "completed" : "not-started"}
            href="/closing/sales/baemin"
          />

          <PlatformCard
            name="쿠팡이츠"
            description="매출 · 주문 수"
            amount={coupangEatsTotal}
            status={
              isCoupangEatsCompleted ? "completed" : "not-started"
            }
            href="/closing/sales/coupang-eats"
          />

          <PlatformCard
            name="요기요"
            description="선결제 · 카드 · 현금 · 요기배달"
            amount={yogiyoTotal}
            status={
              isYogiyoCompleted ? "completed" : "not-started"
            }
            href="/closing/sales/yogiyo"
          />

          <PlatformCard
            name="땡겨요"
            description="선결제"
            amount={ddangyoTotal}
            status={
              isDdangyoCompleted
                ? "completed"
                : "not-started"
            }
            href="/closing/sales/ddangyo"
          />

          <PlatformCard
            name="일반결제"
            description="카드 · 현금 · 계좌이체"
            amount={generalTotal}
            status={
              isGeneralCompleted ? "completed" : "not-started"
            }
            href="/closing/sales/general"
          />
        </section>

        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem("closing-sales-confirmed", "true");
            window.location.href = "/closing";
          }}
          className="mt-7 w-full rounded-2xl bg-indigo-600 px-4 py-4 text-center text-base font-bold text-white transition hover:bg-indigo-700 active:scale-[0.99]"
        >
          매출 확인 완료
        </button>

        <nav className="fixed bottom-4 left-1/2 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 justify-around rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-lg">
          <Link href="/" className="px-4 py-2 text-sm text-slate-500">
            홈
          </Link>

          <Link
            href="/closing"
            className="px-4 py-2 text-sm font-bold text-indigo-600"
          >
            마감
          </Link>

          <Link
            href="/management"
            className="px-4 py-2 text-sm text-slate-500"
          >
            경영
          </Link>

          <Link
            href="/more"
            className="px-4 py-2 text-sm text-slate-500"
          >
            더보기
          </Link>
        </nav>
      </div>
    </main>
  );
}
