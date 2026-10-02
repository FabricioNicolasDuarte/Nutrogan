import { ROLES_GESTORES, ROLES_TECNICOS } from 'src/utils/roleCapabilities'

const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        component: () => import('pages/DashboardPage.vue'),
        meta: { mapPage: true },
      },

      // --- ZONA OPERATIVA (Todos tienen acceso) ---
      { path: 'lotes', component: () => import('pages/LotesPage.vue') },
      {
        path: 'decisiones',
        component: () => import('pages/DecisionesPage.vue'),
        meta: { requiresRole: [...ROLES_TECNICOS] },
      },
      { path: 'lote/:id', component: () => import('pages/LoteDetailPage.vue') },
      {
        path: 'lote/:id/scan_cc',
        component: () => import('pages/CCScanPage.vue'),
        meta: { requiresAuth: true, mapPage: true },
      },

      // --- RECURSOS (Lectura para todos) ---
      { path: 'recursos', component: () => import('pages/RecursosPage.vue') },
      { path: 'recursos/potreros', component: () => import('pages/PotrerosPage.vue') },
      {
        path: 'recursos/despensa',
        component: () => import('pages/DespensaPage.vue'),
        meta: { requiresRole: [...ROLES_GESTORES] },
      },
      { path: 'recursos/agua', component: () => import('pages/AguaPage.vue') },
      { path: 'recursos/lluvias', component: () => import('pages/LluviasPage.vue') },

      // --- ZONA TÉCNICA (Restringida) ---
      {
        path: 'recursos/potreros/draw/:id?',
        component: () => import('pages/PotreroDrawPage.vue'),
        meta: { mapPage: true, requiresRole: [...ROLES_TECNICOS] },
      },
      {
        path: 'recursos/satelital',
        component: () => import('pages/AnalisisSatelitalPage.vue'),
        meta: { mapPage: true, requiresRole: [...ROLES_TECNICOS] },
      },
      { path: 'reportes',
        component: () => import('pages/ReportesPage.vue'),
        meta: { requiresRole: [...ROLES_TECNICOS] },
      },
      {
        path: 'alertas',
        component: () => import('pages/AlertasPage.vue'),
        meta: { requiresAuth: true },
      },

      // Equipo real = Profile TeamManager
      {
        path: 'equipo',
        redirect: (to) => ({ path: '/profile', query: { tab: 'team', ...to.query } }),
        meta: { requiresRole: [...ROLES_GESTORES] },
      },
      // Legacy: founders
      {
        path: 'team',
        redirect: '/fundadores',
        meta: { requiresRole: [...ROLES_GESTORES] },
      },
      {
        path: 'fundadores',
        component: () => import('pages/DeveloperTeamPage.vue'),
        meta: { requiresRole: [...ROLES_GESTORES] },
      },
      {
        path: 'auditoria',
        component: () => import('pages/AuditoriaPage.vue'),
        meta: { requiresRole: ['superadmin'] },
      },

      // --- COMUNES ---
      { path: 'profile', component: () => import('pages/ProfilePage.vue') },
      { path: 'about', component: () => import('pages/AboutNutroganPage.vue') },
      { path: 'technology', component: () => import('pages/TechDeepDivePage.vue') },
      { path: 'support', component: () => import('pages/SupportPage.vue') },
    ],
  },

  // --- MODO CAMPO (Vital para el Operario) ---
  {
    path: '/field',
    component: () => import('layouts/FieldLayout.vue'),
    meta: { requiresAuth: true },
    children: [{ path: '', component: () => import('pages/field/FieldDashboardPage.vue') }],
  },

  {
    path: '/welcome',
    component: () => import('pages/WelcomePage.vue'),
    meta: { requiresAuth: true },
  },
  // Confirmación email / magic link (Supabase redirect)
  {
    path: '/auth/callback',
    component: () => import('pages/AuthCallbackPage.vue'),
  },
  { path: '/login', component: () => import('pages/LoginPage.vue') },
  { path: '/:catchAll(.*)*', component: () => import('pages/ErrorNotFound.vue') },
]

export default routes
