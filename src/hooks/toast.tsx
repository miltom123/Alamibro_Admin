import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; n: number } | null>(null);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flash = useCallback((msg: string) => {
    clearTimeout(t.current);
    setToast((x) => ({ msg, n: (x?.n ?? 0) + 1 }));
    t.current = setTimeout(() => setToast(null), 2200);
  }, []);
  return (
    <ToastCtx.Provider value={flash}>
      {children}
      {toast ? (
        <div
          key={toast.n}
          role="status"
          className="adm-toast fixed bottom-7 left-1/2 z-[90] flex max-w-[calc(100%-32px)] items-center gap-2.5 rounded-[14px] bg-fondo px-5 py-3.5 font-extrabold text-crema shadow-[0_16px_32px_-10px_rgba(0,0,0,.6)]"
        >
          <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-verde text-[13px]">✓</span>
          {toast.msg}
        </div>
      ) : null}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
