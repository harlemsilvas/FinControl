import { useState, type ReactElement } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
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
      { label: 'Empresas', to: '/companies', icon: '▦' },
      { label: 'Parâmetros Empresa', to: '/company-parameters', icon: '▧' },
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
      { label: 'XMLs Importados', to: '/xml-imports', icon: '▧' },
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

function sectionIsActive(section: MenuSection, pathname: string): boolean {
  return section.items.some((item) => item.to && (pathname === item.to || pathname.startsWith(`${item.to}/`)));
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

function MenuSectionGroup({ section, pathname }: { section: MenuSection; pathname: string }): ReactElement {
  const active = sectionIsActive(section, pathname);
  const [isOpen, setIsOpen] = useState(active || !section.title);

  if (!section.title) {
    return (
      <div className="space-y-1">
        {section.items.map((item) => (
          <MenuEntry key={item.label} item={item} />
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.03]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-200 transition hover:bg-white/10 hover:text-white"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <span>{section.title}</span>
        <span className={`text-sm transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true">›</span>
      </button>
      {isOpen ? (
        <div className="space-y-1 px-2 pb-2">
          {section.items.map((item) => (
            <MenuEntry key={item.label} item={item} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function AppShell(): ReactElement {
  const auth = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { session } = auth;
  const companies = session?.user.companies ?? [];
  const defaultCompany = companies.find((company) => company.id === session?.user.defaultCompanyId)
    ?? companies.find((company) => company.isDefault);
  const companyLabel = defaultCompany?.tradeName || defaultCompany?.legalName;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:flex">
      {sidebarOpen ? <button type="button" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} /> : null}
      {sidebarOpen ? (
      <aside className="fixed inset-y-0 left-0 z-40 w-72 bg-slate-950 text-white shadow-2xl shadow-slate-950/30 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:shadow-none">
        <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.24),transparent_34%),linear-gradient(180deg,#061b3a_0%,#031326_100%)]">
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
            <FinControlMark />
            <div className="min-w-0">
              <p className="truncate text-xl font-extrabold leading-tight tracking-tight">FinControl</p>
              <p className="truncate text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-300">
                Contas a pagar
              </p>
            </div>
            <button type="button" className="ml-auto rounded-lg px-2 py-1 text-lg text-slate-300 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)}>
              ×
            </button>
          </div>

          <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-5" aria-label="Menu principal">
            {menuSections.map((section, index) => (
              <MenuSectionGroup key={section.title ?? `main-${index}`} section={section} pathname={location.pathname} />
            ))}
          </nav>

          <div className="border-t border-white/10 px-5 py-4 text-xs text-slate-400">FinControl v1.0.0</div>
        </div>
      </aside>
      ) : null}

      <div className="min-w-0 flex-1">
        <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-xl font-bold text-slate-700 transition hover:bg-slate-50"
              aria-label={sidebarOpen ? 'Ocultar menu' : 'Mostrar menu'}
              onClick={() => setSidebarOpen((value) => !value)}
            >
              ☰
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{session?.user.fullName}</p>
              <p className="truncate text-xs text-slate-500">{companyLabel ?? (session?.user.roles.join(', ') || 'Usuário')}</p>
            </div>
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
