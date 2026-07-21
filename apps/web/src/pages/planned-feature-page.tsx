import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Card } from '../components/ui/card';
import type { PlannedFeature } from './planned-features';

export function PlannedFeaturePage({ feature }: { feature: PlannedFeature }): ReactElement {
  return (
    <div className="grid gap-6">
      <header>
        <Breadcrumb items={[{ label: feature.domain }, { label: feature.title }]} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{feature.title}</h1>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
            Planejado
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-slate-600">{feature.description}</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <h2 className="text-lg font-bold">Placeholder funcional</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Esta tela já está reservada na navegação para manter a estrutura do produto consistente, mas ainda não possui fluxo operacional completo.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Quando esta área for priorizada, vamos partir da documentação, validar modelo de dados, criar migrations novas quando necessário e só então implementar API e interface.
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Próximos passos sugeridos</h2>
          <ul className="mt-3 grid gap-2 text-sm text-slate-600">
            {feature.suggestedNextSteps.map((step) => (
              <li key={step} className="flex gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden="true" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <div>
        <Link className="text-sm font-bold text-blue-700 hover:underline" to="/dashboard">
          Voltar ao dashboard
        </Link>
      </div>
    </div>
  );
}