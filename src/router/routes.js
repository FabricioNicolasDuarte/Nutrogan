const routes = [
  // --- RUTA PRINCIPAL (MODO OFICINA/NORMAL - HUD) ---
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true }, // Auth básica requerida para todo el layout
    children: [
      // --- DASHBOARD & OPERACIONES (Acceso General) ---
      {
        path: '',
        component: () => import('pages/DashboardPage.vue'),
        meta: { mapPage: true },
      },
      { path: 'lotes', component: () => import('pages/LotesPage.vue') },
      { path: 'lote/:id', component: () => import('pages/LoteDetailPage.vue') },
      {
        path: 'lote/:id/scan_cc',
        component: () => import('pages/CCScanPage.vue'),
        meta: { requiresAuth: true, mapPage: true },
      },

      // --- RECURSOS (Carga de datos permitida a todos) ---
      { path: 'recursos', component: () => import('pages/RecursosPage.vue') },
      { path: 'recursos/potreros', component: () => import('pages/PotrerosPage.vue') },
      { path: 'recursos/despensa', component: () => import('pages/DespensaPage.vue') },
      { path: 'recursos/agua', component: () => import('pages/AguaPage.vue') },
      { path: 'recursos/lluvias', component: () => import('pages/LluviasPage.vue') },

      // --- MÓDULOS TÉCNICOS (Restringido a Admin y Técnico) ---
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

      // --- ADMINISTRACIÓN & EQUIPO (Solo Superadmin) ---
      {
        path: 'team',
        component: () => import('pages/DeveloperTeamPage.vue'),
        meta: { requiresRole: ['admin'] },
      },

      // --- GENERAL (Perfil, Ayuda, Info) ---
      { path: 'profile', component: () => import('pages/ProfilePage.vue') },
      { path: 'about', component: () => import('pages/AboutNutroganPage.vue') },
      { path: 'technology', component: () => import('pages/TechDeepDivePage.vue') },
      { path: 'support', component: () => import('pages/SupportPage.vue') },
    ],
  },

  // --- RUTA PARALELA: MODO CAMPO (Ideal para Operarios) ---
  {
    path: '/field',
    component: () => import('layouts/FieldLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        component: () => import('pages/field/FieldDashboardPage.vue'),
      },
    ],
  },

  // --- RUTAS PÚBLICAS Y DE AUTENTICACIÓN ---

  {
    path: '/welcome',
    component: () => import('pages/WelcomePage.vue'),
    // Quitamos requiresAuth si quieres que sea pública, o lo dejas si es interna
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue'),
  },

  // --- NUEVA RUTA: CALLBACK DE AUTENTICACIÓN (Página de Éxito) ---
  // Esta es la ruta a la que Supabase redirigirá al usuario
  {
    path: '/auth/callback',
    component: () => import('pages/AuthCallbackPage.vue'),
  },

  // --- 404 (Siempre al final) ---
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
