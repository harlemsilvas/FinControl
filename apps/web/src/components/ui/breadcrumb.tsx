import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }): ReactElement {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={`${item.label}-${index}`} className="contents">
            {index > 0 && <span aria-hidden="true">?</span>}
            {item.to && !isLast ? (
              <Link to={item.to} className="font-medium text-slate-600 hover:text-teal-700">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
