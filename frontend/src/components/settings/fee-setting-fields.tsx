import type { ReactNode } from "react";

type BaseFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  description?: string;
};

type NumberFieldProps = BaseFieldProps & {
  unit: "%" | "원";
  inputMode: "decimal" | "numeric";
  step: string;
  max?: number;
};

function NumberSettingField({
  id,
  label,
  value,
  onChange,
  error,
  description,
  unit,
  inputMode,
  step,
  max,
}: NumberFieldProps) {
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-slate-700">
        {label}
      </label>

      {description && (
        <p id={descriptionId} className="mt-1 text-xs text-slate-400">
          {description}
        </p>
      )}

      <div
        className={`mt-2 flex min-h-13 items-center rounded-2xl border bg-white px-4 focus-within:ring-2 focus-within:ring-indigo-100 ${
          error ? "border-rose-300" : "border-slate-200"
        }`}
      >
        <input
          id={id}
          type="number"
          inputMode={inputMode}
          min="0"
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? errorId : description ? descriptionId : undefined
          }
          className="min-w-0 flex-1 bg-transparent py-3 text-base font-semibold text-slate-950 outline-none"
        />
        <span className="ml-3 shrink-0 text-sm font-semibold text-slate-400">
          {unit}
        </span>
      </div>

      {error && (
        <p id={errorId} className="mt-2 text-xs leading-5 text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

type FeeRateFieldProps = BaseFieldProps & {
  max?: number;
};

export function FeeRateField({ max = 100, ...props }: FeeRateFieldProps) {
  return (
    <NumberSettingField
      {...props}
      unit="%"
      inputMode="decimal"
      step="0.01"
      max={max}
    />
  );
}

export function PerOrderFeeField(props: BaseFieldProps) {
  return (
    <NumberSettingField
      {...props}
      unit="원"
      inputMode="numeric"
      step="1"
    />
  );
}

type SettingChannelCardProps = {
  title: string;
  children?: ReactNode;
  description?: string;
};

export function SettingChannelCard({
  title,
  children,
  description,
}: SettingChannelCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 p-5">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      {description && (
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {description}
        </p>
      )}
      {children && <div className="mt-5 space-y-4">{children}</div>}
    </section>
  );
}
