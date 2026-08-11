import type { ReactElement } from 'react';

export function FinControlMark({ className = 'size-10' }: { className?: string }): ReactElement {
  return (
    <span
      className={`relative grid shrink-0 place-items-end rounded-xl bg-emerald-500/10 p-1 ${className}`}
      aria-hidden="true"
    >
      <span className="h-[42%] w-[22%] rounded-sm bg-emerald-400" />
      <span className="absolute bottom-[10%] left-[40%] h-[62%] w-[22%] rounded-sm bg-teal-400" />
      <span className="absolute bottom-[10%] right-[15%] h-[82%] w-[22%] rounded-sm bg-cyan-300" />
    </span>
  );
}
