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
      // IMPORTANTE: El Operario necesita entrar aquí para ver listados básicos
      { path: 'lotes', component: () => import('pages/LotesPage.vue') },
      { path: 'lote/:id', component: () => import('pages/LoteDetailPage.vue') },
      {
        path: 'lote/:id/scan_cc',
        component: () => import('pages/CCScanPage.vue'),
        meta: { requiresAuth: true, mapPage: true },
      },

      // --- RECURSOS (Lectura para todos) ---
      { path: 'recursos', component: () => import('pages/RecursosPage.vue') },
      { path: 'recursos/potreros', component: () => import('pages/PotrerosPage.vue') },
      { path: 'recursos/despensa', component: () => import('pages/DespensaPage.vue') },
      { path: 'recursos/agua', component: () => import('pages/AguaPage.vue') },
      { path: 'recursos/lluvias', component: () => import('pages/LluviasPage.vue') },

      // --- ZONA TÉCNICA (Restringida) ---
      {
        path: 'recursos/potreros/draw/:id?',
        component: () => import('pages/PotreroDrawPage.vue'),
        meta: { mapPage: true, requiresRole: ['admin', 'tecnico'] },
      },
      {
        path: 'recursos/satelital',
        component: () => import('pages/AnalisisSatelitalPage.vue'),
        meta: { mapPage: true, requiresRole: ['admin', 'tecnico'] },
      },
      {
        path: 'reportes',
        component: () => import('pages/ReportesPage.vue'),
        meta: { requiresRole: ['admin', 'tecnico'] },
      },

      // --- ZONA ADMINISTRATIVA (Restringida) ---
      {
        path: 'team',
        component: () => import('pages/DeveloperTeamPage.vue'),
        meta: { requiresRole: ['admin'] },
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
    meta: { requiresAuth: true }, // Todos pueden entrar
    children: [{ path: '', component: () => import('pages/field/FieldDashboardPage.vue') }],
  },

  {
    path: '/welcome',
    component: () => import('pages/WelcomePage.vue'),
    meta: { requiresAuth: true },
  },
  { path: '/login', component: () => import('pages/LoginPage.vue') },
  { path: '/:catchAll(.*)*', component: () => import('pages/ErrorNotFound.vue') },
]

export default routes
