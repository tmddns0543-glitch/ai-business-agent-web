import Link from "next/link";
import type { ReactNode } from "react";

export function AuthPage({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-md rounded-[2rem] bg-white px-5 py-8 shadow-sm sm:px-7">
        <p className="text-sm font-bold text-indigo-600">AI Business Agent</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        <div className="mt-7">{children}</div>
        {footer && <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">{footer}</div>}
      </section>
    </main>
  );
}

export function AuthField({ id, label, type, autoComplete, name = id }: { id: string; label: string; type: "email" | "password"; autoComplete: string; name?: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold text-slate-700">{label}</label>
      <input id={id} name={name} type={type} autoComplete={autoComplete} required className="mt-2 h-14 w-full rounded-xl border border-slate-200 px-4 text-base outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="font-bold text-indigo-600 hover:text-indigo-700">{children}</Link>;
}
