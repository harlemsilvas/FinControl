import type { ReactElement } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';

type MenuItem = {
  label: string;
  to?: string;
  icon: string;
};

type MenuSection = {
  title?: string;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    items: [{ label: 'Dashboard', to: '/dashboard', icon: '⌂' }],
  },
  {
    title: 'Cadastros',
    items: [
      { label: 'Fornecedores', to: '/suppliers', icon: '◉' },
      { label: 'Categorias', to: '/financial-categories', icon: '◇' },
      { label: 'Centros de Custo', to: '/cost-centers', icon: '▤' },
      { label: 'Contas Bancárias', to: '/bank-accounts', icon: '▥' },
      { label: 'Tipos de Documento', to: '/document-types', icon: '▣' },
      { label: 'Formas de Pagamento', to: '/payment-methods', icon: '▧' },
      { label: 'Condições de Pagamento', to: '/payment-terms', icon: '▦' },
      { label: 'Bancos', to: '/banks', icon: '▨' },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { label: 'Contas a Pagar', to: '/payables', icon: '▩' },
      { label: 'Agenda', to: '/agenda', icon: '□' },
      { label: 'Aprovações', to: '/approvals', icon: '✓' },
      { label: 'Pagamentos', to: '/payments', icon: '$' },
      { label: 'Recorrências', to: '/recurrences', icon: '↻' },
      { label: 'Conciliação Bancária', to: '/bank-reconciliation', icon: '≋' },
    ],
  },
  {
    title: 'Relatórios',
    items: [
      { label: 'Relatórios', to: '/reports', icon: '▱' },
      { label: 'Dashboards', to: '/analytics-dashboards', icon: '◔' },
      { label: 'Fluxo de Caixa', to: '/cash-flow', icon: '〽' },
      { label: 'Indicadores', to: '/indicators', icon: '⌁' },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { label: 'Usuários', to: '/users', icon: '♙' },
      { label: 'Perfis de Acesso', to: '/access-profiles', icon: '⚙' },
      { label: 'Parâmetros', to: '/parameters', icon: '⚙' },
    ],
  },
];

function FinControlMark(): ReactElement {
  return (
    <span
      className="relative grid size-10 shrink-0 place-items-end rounded-xl bg-emerald-500/10 p-1"
      aria-hidden="true"
    >
      <span className="h-4 w-2 rounded-sm bg-emerald-400" />
      <span className="absolute bottom-1 left-4 h-6 w-2 rounded-sm bg-teal-400" />
      <span className="absolute bottom-1 right-2 h-8 w-2 rounded-sm bg-cyan-300" />
    </span>
  );
}

function MenuEntry({ item }: { item: MenuItem }): ReactElement {
  const content = (
    <>
      <span className="grid size-5 shrink-0 place-items-center text-base leading-none text-current/85" aria-hidden="true">
        {item.icon}
      </span>
      <span className="truncate">{item.label}</span>
    </>
  );

  if (!item.to) {
    return (
      <span
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400/70"
        aria-disabled="true"
        title="Tela ainda não implementada"
      >
        {content}
      </span>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.to === '/dashboard'}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
          isActive
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/20'
            : 'text-slate-200 hover:bg-white/10 hover:text-white',
        ].join(' ')
      }
    >
      {content}
    </NavLink>
  );
}

export function AppShell(): ReactElement {
  const auth = useAuth();
  const { session } = auth;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="bg-slate-950 text-white lg:min-h-screen">
        <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.24),transparent_34%),linear-gradient(180deg,#061b3a_0%,#031326_100%)]">
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
            <FinControlMark />
            <div className="min-w-0">
              <p className="truncate text-xl font-extrabold leading-tight tracking-tight">FinControl</p>
              <p className="truncate text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-300">
                Contas a pagar
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5" aria-label="Menu principal">
            {menuSections.map((section, index) => (
              <div key={section.title ?? `main-${index}`} className="space-y-1">
                {section.title ? (
                  <p className="px-2 pb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </p>
                ) : null}
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <MenuEntry key={item.label} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-white/10 px-5 py-4 text-xs text-slate-400">FinControl v1.0.0</div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold">{session?.user.fullName}</p>
            <p className="text-xs text-slate-500">{session?.user.roles.join(', ') || 'Usuário'}</p>
          </div>
          <button
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            onClick={() => void auth.signOut()}
          >
            Sair
          </button>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
