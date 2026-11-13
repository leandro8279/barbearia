import { lazy, ReactNode, Suspense, useEffect } from 'react';

import { ForbiddenPage } from '@/modules/core/pages/forbidden';
import { NotFoundPage } from '@/modules/core/pages/not-found';

import { AccountLayout } from '@/shared/components/account-layout';
import { AdminLayout } from '@/shared/components/admin-layout';
import { AuthLayout } from '@/shared/components/auth-layout';
import { BookingLayout } from '@/shared/components/booking-layout';
import { RenderComponent } from '@/shared/components/render-component';
import { RouteMeta } from '@/shared/components/route-placeholder';
import { SiteLayout } from '@/shared/components/site-layout';
import { setPageMetadata } from '@/shared/lib/page-meta';

import { Route, Switch, useLocation, useSearch } from 'wouter';

const HomePage = lazy(() => import('@/modules/site/pages/home-page'));
const DevUiPage = import.meta.env.DEV ? lazy(() => import('@/shared/pages/ui-gallery-page')) : () => <div>Error</div>;

function Layout({ kind, children }: { kind: RouteMeta['layout']; children: ReactNode }) {
  switch (kind) {
    case 'site':
      return <SiteLayout>{children}</SiteLayout>;
    case 'booking':
      return <BookingLayout>{children}</BookingLayout>;
    case 'auth':
      return <AuthLayout>{children}</AuthLayout>;
    case 'account':
      return <AccountLayout>{children}</AccountLayout>;
    case 'admin':
      return <AdminLayout>{children}</AdminLayout>;
    default:
      return <>{children}</>;
  }
}

const definitions: RouteMeta[] = [
  {
    id: 'L01',
    title: 'Entrar',
    description: 'Acesse sua conta da Barbearia.',
    url: '/entrar',
    matchPath: '/entrar',
    access: 'Público',
    layout: 'auth',
  },
  {
    id: 'L02',
    title: 'Criar conta',
    description: 'Crie sua conta para acompanhar seus agendamentos.',
    url: '/cadastrar',
    matchPath: '/cadastrar',
    access: 'Público',
    layout: 'auth',
  },
  {
    id: 'L03',
    title: 'Recuperar senha',
    description: 'Solicite um link para redefinir sua senha.',
    url: '/entrar?recuperar=1',
    matchPath: '/entrar',
    query: { key: 'recuperar', value: '1' },
    access: 'Público',
    layout: 'auth',
  },
  {
    id: 'L04',
    title: 'Redefinir senha',
    description: 'Defina uma nova senha para sua conta.',
    url: '/redefinir-senha/demo-token',
    matchPath: '/redefinir-senha/:token',
    access: 'Público',
    layout: 'auth',
  },
  {
    id: 'L05',
    title: 'Acesso da equipe',
    description: 'Entre no painel da equipe.',
    url: '/admin/login',
    matchPath: '/admin/login',
    access: 'Público',
    layout: 'auth',
  },
  { id: 'S01', title: 'Início', description: 'Agende seu próximo corte na Barbearia.', url: '/', matchPath: '/', access: 'Público', layout: 'site' },
  {
    id: 'S02',
    title: 'Serviços',
    description: 'Conheça os serviços da Barbearia.',
    url: '/servicos',
    matchPath: '/servicos',
    access: 'Público',
    layout: 'site',
  },
  {
    id: 'S04',
    title: 'Profissionais',
    description: 'Conheça a equipe da Barbearia.',
    url: '/barbeiros',
    matchPath: '/barbeiros',
    access: 'Público',
    layout: 'site',
  },
  {
    id: 'S09',
    title: 'Contato e horários',
    description: 'Veja como encontrar a Barbearia e nossos horários.',
    url: '/contato',
    matchPath: '/contato',
    access: 'Público',
    layout: 'site',
  },
  {
    id: 'B02',
    title: 'Escolher serviços',
    description: 'Escolha os serviços do seu agendamento.',
    url: '/agendar',
    matchPath: '/agendar',
    access: 'Público',
    layout: 'booking',
  },
  {
    id: 'B03',
    title: 'Escolher profissional',
    description: 'Escolha seu profissional ou deixe a escolha em aberto.',
    url: '/agendar/profissional',
    matchPath: '/agendar/profissional',
    access: 'Público',
    layout: 'booking',
  },
  {
    id: 'B04',
    title: 'Data e horário',
    description: 'Escolha uma data e um horário disponível.',
    url: '/agendar/horario',
    matchPath: '/agendar/horario',
    access: 'Público',
    layout: 'booking',
  },
  {
    id: 'B05',
    title: 'Seus dados',
    description: 'Informe os dados para confirmar o agendamento.',
    url: '/agendar/dados',
    matchPath: '/agendar/dados',
    access: 'Público',
    layout: 'booking',
  },
  {
    id: 'B06',
    title: 'Revisão e pagamento',
    description: 'Confira os dados do agendamento antes de confirmar.',
    url: '/agendar/revisao',
    matchPath: '/agendar/revisao',
    access: 'Público',
    layout: 'booking',
  },
  {
    id: 'B07',
    title: 'Agendamento confirmado',
    description: 'Veja a confirmação do seu agendamento.',
    url: '/agendar/confirmado/demo',
    matchPath: '/agendar/confirmado/:id',
    access: 'Público',
    layout: 'booking',
  },
  {
    id: 'A01',
    title: 'Visão geral',
    description: 'Resumo da sua conta e próximos horários.',
    url: '/conta',
    matchPath: '/conta',
    access: 'Autenticado',
    layout: 'account',
  },
  {
    id: 'A02',
    title: 'Meus agendamentos',
    description: 'Acompanhe seus agendamentos.',
    url: '/conta/agendamentos',
    matchPath: '/conta/agendamentos',
    access: 'Autenticado',
    layout: 'account',
  },
  {
    id: 'A03',
    title: 'Detalhe do agendamento',
    description: 'Confira os detalhes do seu horário.',
    url: '/conta/agendamentos/demo',
    matchPath: '/conta/agendamentos/:id',
    access: 'Autenticado',
    layout: 'account',
  },
  {
    id: 'A04',
    title: 'Reagendar',
    description: 'Escolha um novo horário para seu agendamento.',
    url: '/conta/agendamentos?reagendar=1',
    matchPath: '/conta/agendamentos',
    query: { key: 'reagendar', value: '1' },
    access: 'Autenticado',
    layout: 'account',
  },
  {
    id: 'A05',
    title: 'Cancelar agendamento',
    description: 'Confira as condições para cancelar seu agendamento.',
    url: '/conta/agendamentos?cancelar=1',
    matchPath: '/conta/agendamentos',
    query: { key: 'cancelar', value: '1' },
    access: 'Autenticado',
    layout: 'account',
  },
  {
    id: 'A15',
    title: 'Meu perfil',
    description: 'Consulte e atualize seus dados.',
    url: '/conta/perfil',
    matchPath: '/conta/perfil',
    access: 'Autenticado',
    layout: 'account',
  },
  {
    id: 'D01',
    title: 'Visão geral',
    description: 'Resumo operacional da barbearia.',
    url: '/admin',
    matchPath: '/admin',
    access: 'agenda.read',
    layout: 'admin',
    permission: 'agenda.read',
    roles: ['admin', 'manager', 'reception', 'barber'],
  },
  {
    id: 'D02',
    title: 'Meu dia',
    description: 'Resumo dos atendimentos de hoje.',
    url: '/admin/meu-dia',
    matchPath: '/admin/meu-dia',
    access: 'agenda.read',
    layout: 'admin',
    permission: 'agenda.read',
  },
  {
    id: 'G01',
    title: 'Agenda',
    description: 'Acompanhe os horários da equipe.',
    url: '/admin/agenda',
    matchPath: '/admin/agenda',
    access: 'agenda.read',
    layout: 'admin',
    permission: 'agenda.read',
  },
  {
    id: 'G02',
    title: 'Novo agendamento',
    description: 'Cadastre um horário na agenda.',
    url: '/admin/agenda?novo=1',
    matchPath: '/admin/agenda',
    query: { key: 'novo', value: '1' },
    access: 'agenda.write',
    layout: 'admin',
    permission: 'agenda.write',
  },
  {
    id: 'G03',
    title: 'Detalhe do agendamento',
    description: 'Confira os dados de um horário.',
    url: '/admin/agenda?ag=demo',
    matchPath: '/admin/agenda',
    query: { key: 'ag' },
    access: 'agenda.read',
    layout: 'admin',
    permission: 'agenda.read',
  },
  {
    id: 'G04',
    title: 'Remarcar',
    description: 'Escolha outro horário para o atendimento.',
    url: '/admin/agenda?remarcar=1',
    matchPath: '/admin/agenda',
    query: { key: 'remarcar', value: '1' },
    access: 'agenda.write',
    layout: 'admin',
    permission: 'agenda.write',
  },
  {
    id: 'G05',
    title: 'Cancelar ou no-show',
    description: 'Registre o cancelamento ou a ausência do cliente.',
    url: '/admin/agenda?cancelar=1',
    matchPath: '/admin/agenda',
    query: { key: 'cancelar', value: '1' },
    access: 'agenda.write',
    layout: 'admin',
    permission: 'agenda.write',
  },
  {
    id: 'G06',
    title: 'Bloqueio de horário',
    description: 'Bloqueie um período na agenda.',
    url: '/admin/agenda?bloqueio=1',
    matchPath: '/admin/agenda',
    query: { key: 'bloqueio', value: '1' },
    access: 'agenda.write',
    layout: 'admin',
    permission: 'agenda.write',
  },
  {
    id: 'G09',
    title: 'Atendimento',
    description: 'Acompanhe o atendimento em andamento.',
    url: '/admin/atendimento/demo',
    matchPath: '/admin/atendimento/:id',
    access: 'agenda.write',
    layout: 'admin',
    permission: 'agenda.write',
  },
  {
    id: 'Q01',
    title: 'Comandas e caixa',
    description: 'Acompanhe as comandas e os recebimentos.',
    url: '/admin/caixa',
    matchPath: '/admin/caixa',
    access: 'cash.read',
    layout: 'admin',
    permission: 'cash.read',
  },
  {
    id: 'Q02',
    title: 'Detalhe da comanda',
    description: 'Consulte os itens e pagamentos da comanda.',
    url: '/admin/caixa/comandas/demo',
    matchPath: '/admin/caixa/comandas/:id',
    access: 'cash.write',
    layout: 'admin',
    permission: 'cash.write',
  },
  {
    id: 'Q03',
    title: 'Adicionar item',
    description: 'Adicione um serviço ou produto à comanda.',
    url: '/admin/caixa/comandas/demo?item=1',
    matchPath: '/admin/caixa/comandas/:id',
    query: { key: 'item', value: '1' },
    access: 'cash.write',
    layout: 'admin',
    permission: 'cash.write',
  },
  {
    id: 'Q04',
    title: 'Fechar conta',
    description: 'Registre pagamentos e finalize a comanda.',
    url: '/admin/caixa?fechar=1',
    matchPath: '/admin/caixa',
    query: { key: 'fechar', value: '1' },
    access: 'cash.write',
    layout: 'admin',
    permission: 'cash.write',
  },
  {
    id: 'Q05',
    title: 'Abertura e fechamento de caixa',
    description: 'Confira o caixa do dia.',
    url: '/admin/caixa/sessao',
    matchPath: '/admin/caixa/sessao',
    access: 'cash.write',
    layout: 'admin',
    permission: 'cash.write',
  },
  {
    id: 'Q06',
    title: 'Sangria e suprimento',
    description: 'Registre uma movimentação de caixa.',
    url: '/admin/caixa?movimento=1',
    matchPath: '/admin/caixa',
    query: { key: 'movimento', value: '1' },
    access: 'cash.write',
    layout: 'admin',
    permission: 'cash.write',
  },
  {
    id: 'P01',
    title: 'Serviços',
    description: 'Gerencie os serviços oferecidos.',
    url: '/admin/servicos',
    matchPath: '/admin/servicos',
    access: 'catalog.read',
    layout: 'admin',
    permission: 'catalog.read',
  },
  {
    id: 'P02',
    title: 'Serviço',
    description: 'Consulte ou edite um serviço.',
    url: '/admin/servicos?servico=demo',
    matchPath: '/admin/servicos',
    query: { key: 'servico' },
    access: 'catalog.write',
    layout: 'admin',
    permission: 'catalog.write',
  },
  {
    id: 'P08',
    title: 'Produtos',
    description: 'Gerencie os produtos da barbearia.',
    url: '/admin/produtos',
    matchPath: '/admin/produtos',
    access: 'catalog.read',
    layout: 'admin',
    permission: 'catalog.read',
  },
  {
    id: 'P09',
    title: 'Produto',
    description: 'Consulte ou edite um produto.',
    url: '/admin/produtos/demo',
    matchPath: '/admin/produtos/:id',
    access: 'catalog.write',
    layout: 'admin',
    permission: 'catalog.write',
  },
  {
    id: 'U01',
    title: 'Clientes',
    description: 'Consulte os clientes cadastrados.',
    url: '/admin/clientes',
    matchPath: '/admin/clientes',
    access: 'customers.read',
    layout: 'admin',
    permission: 'customers.read',
  },
  {
    id: 'U02',
    title: 'Perfil do cliente',
    description: 'Consulte os dados e o histórico do cliente.',
    url: '/admin/clientes/demo',
    matchPath: '/admin/clientes/:id',
    access: 'customers.read',
    layout: 'admin',
    permission: 'customers.read',
  },
  {
    id: 'U04',
    title: 'Cliente',
    description: 'Cadastre ou atualize um cliente.',
    url: '/admin/clientes?cliente=demo',
    matchPath: '/admin/clientes',
    query: { key: 'cliente' },
    access: 'customers.write',
    layout: 'admin',
    permission: 'customers.write',
  },
  {
    id: 'M01',
    title: 'Profissionais',
    description: 'Gerencie a equipe da barbearia.',
    url: '/admin/equipe',
    matchPath: '/admin/equipe',
    access: 'team.read',
    layout: 'admin',
    permission: 'team.read',
  },
  {
    id: 'M02',
    title: 'Profissional',
    description: 'Consulte os dados de um profissional.',
    url: '/admin/equipe/demo',
    matchPath: '/admin/equipe/:id',
    access: 'team.write',
    layout: 'admin',
    permission: 'team.write',
  },
  {
    id: 'M03',
    title: 'Escala semanal',
    description: 'Configure a escala semanal do profissional.',
    url: '/admin/equipe/demo/escala',
    matchPath: '/admin/equipe/:id/escala',
    access: 'team.write',
    layout: 'admin',
    permission: 'team.write',
  },
  {
    id: 'M04',
    title: 'Folgas e férias',
    description: 'Consulte e cadastre folgas da equipe.',
    url: '/admin/equipe?folga=1',
    matchPath: '/admin/equipe',
    query: { key: 'folga', value: '1' },
    access: 'team.write',
    layout: 'admin',
    permission: 'team.write',
  },
  {
    id: 'M05',
    title: 'Comissões',
    description: 'Acompanhe as comissões da equipe.',
    url: '/admin/comissoes',
    matchPath: '/admin/comissoes',
    access: 'team.read',
    layout: 'admin',
    permission: 'team.read',
  },
  {
    id: 'M08',
    title: 'Usuários e permissões',
    description: 'Gerencie acessos e permissões da equipe.',
    url: '/admin/usuarios',
    matchPath: '/admin/usuarios',
    access: 'team.manage',
    layout: 'admin',
    permission: 'team.manage',
  },
  {
    id: 'F01',
    title: 'Visão geral financeira',
    description: 'Resumo financeiro da barbearia.',
    url: '/admin/financeiro',
    matchPath: '/admin/financeiro',
    access: 'finance.read',
    layout: 'admin',
    permission: 'finance.read',
  },
  {
    id: 'F03',
    title: 'Despesas',
    description: 'Acompanhe as despesas da barbearia.',
    url: '/admin/financeiro/despesas',
    matchPath: '/admin/financeiro/despesas',
    access: 'finance.read',
    layout: 'admin',
    permission: 'finance.read',
  },
  {
    id: 'T01',
    title: 'Dados do negócio',
    description: 'Consulte os dados da barbearia.',
    url: '/admin/config',
    matchPath: '/admin/config',
    access: 'settings.read',
    layout: 'admin',
    permission: 'settings.read',
  },
  {
    id: 'T04',
    title: 'Horários e feriados',
    description: 'Configure horários de funcionamento e feriados.',
    url: '/admin/config/horarios',
    matchPath: '/admin/config/horarios',
    access: 'settings.write',
    layout: 'admin',
    permission: 'settings.write',
  },
  {
    id: 'T05',
    title: 'Regras de agendamento',
    description: 'Configure as regras dos agendamentos.',
    url: '/admin/config/agendamento',
    matchPath: '/admin/config/agendamento',
    access: 'settings.write',
    layout: 'admin',
    permission: 'settings.write',
  },
  {
    id: 'T07',
    title: 'Notificações e lembretes',
    description: 'Configure lembretes e notificações.',
    url: '/admin/config/notificacoes',
    matchPath: '/admin/config/notificacoes',
    access: 'settings.write',
    layout: 'admin',
    permission: 'settings.write',
  },
];

const routeGroups = new Map<string, RouteMeta>();
definitions.forEach((definition) => {
  if (!routeGroups.has(definition.matchPath) || !definition.query) {
    routeGroups.set(definition.matchPath, definition);
  }
});

function resolveRoute(baseRoute: RouteMeta, search: string): RouteMeta {
  const query = new URLSearchParams(search);
  return (
    definitions.find(
      (candidate) =>
        candidate.matchPath === baseRoute.matchPath &&
        candidate.query &&
        query.has(candidate.query.key) &&
        (candidate.query.value === undefined || query.get(candidate.query.key) === candidate.query.value),
    ) ?? baseRoute
  );
}

const pages: Record<string, React.JSX.Element> = {
  S01: <HomePage />,
};

function RoutedPage({ route }: { route: RouteMeta }) {
  const search = useSearch();
  const [location] = useLocation();
  console.log('ola');

  const activeRoute = resolveRoute(route, search);
  console.log({ activeRoute: activeRoute.id });
  useEffect(() => {
    setPageMetadata(
      activeRoute.title,
      activeRoute.description,
      activeRoute.access === 'Público' && activeRoute.id !== 'S01',
      activeRoute.layout === 'admin' ? 'Painel administrativo' : 'Barbearia',
    );
  }, [activeRoute, location]);

  const fallback = (
    <div className="mx-auto max-w-3xl animate-pulse rounded-2xl border border-border bg-card p-10 text-muted-foreground">Carregando tela...</div>
  );

  console.log(activeRoute.id);

  return (
    <Layout kind={activeRoute.layout}>
      <Suspense fallback={fallback}>{pages[activeRoute.id]}</Suspense>
    </Layout>
  );
}

export function Router() {
  return (
    <Switch>
      {[...routeGroups.entries()].map(([path, route]) => (
        <Route key={path} path={path}>
          <RoutedPage route={route} />
        </Route>
      ))}
      <RenderComponent condition={DevUiPage}>
        <Route path="/_ui">
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Carregando componentes...</div>}>
            <DevUiPage />
          </Suspense>
        </Route>
      </RenderComponent>
      <Route path="/403">
        <ForbiddenPage />
      </Route>
      <Route>
        <NotFoundPage />
      </Route>
    </Switch>
  );
}
