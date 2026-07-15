type MoneyFieldProps = {
  label: string;
  description?: string;
  value: number;
  unit?: "원" | "건";
  onChange: (value: number) => void;
};

export default function MoneyField({
  label,
  description,
  value,
  unit = "원",
  onChange,
}: MoneyFieldProps) {
  function handleChange(rawValue: string) {
    const onlyNumbers = rawValue.replace(/\D/g, "");

    onChange(onlyNumbers ? Number(onlyNumbers) : 0);
  }

  return (
    <label className="block rounded-2xl border border-slate-200 p-4">
      <span className="text-sm font-bold text-slate-800">{label}</span>

      {description && (
        <span className="mt-1 block text-xs leading-5 text-slate-400">
          {description}
        </span>
      )}

      <div className="mt-3 flex items-center rounded-xl bg-slate-50 px-4 focus-within:ring-2 focus-within:ring-indigo-100">
        <input
          type="text"
          inputMode="numeric"
          value={value === 0 ? "" : value.toLocaleString("ko-KR")}
          placeholder="0"
          onChange={(event) => handleChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent py-4 text-right text-xl font-bold text-slate-950 outline-none"
        />

        <span className="ml-2 text-sm font-medium text-slate-500">
          {unit}
        </span>
      </div>
    </label>
  );
}