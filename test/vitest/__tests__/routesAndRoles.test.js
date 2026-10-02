import { describe, expect, it } from 'vitest'
import routes from 'src/router/routes'
import { PROTECTED_ROUTE_ROLES, roleCapabilities } from 'src/utils/roleCapabilities'

function flattenRoutes(list, base = '') {
  const out = []
  for (const r of list) {
    const path = `${base}/${(r.path || '').replace(/^\//, '')}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
    if (r.component || r.redirect) {
      out.push({
        path: path === '' ? '/' : path,
        requiresAuth: !!(r.meta?.requiresAuth || list !== routes),
        requiresRole: r.meta?.requiresRole || null,
        redirect: r.redirect || null,
      })
    }
    if (r.children) {
      const parentAuth = r.meta?.requiresAuth
      const kids = flattenRoutes(r.children, path === '/' ? '' : path)
      for (const k of kids) {
        if (parentAuth) k.requiresAuth = true
        out.push(k)
      }
    }
  }
  return out
}

describe('roleCapabilities', () => {
  it('superadmin tiene equipo, reportes y auditoría', () => {
    const c = roleCapabilities('superadmin')
    expect(c.canManageTeam).toBe(true)
    expect(c.canAssignSuperadmin).toBe(true)
    expect(c.canViewAudit).toBe(true)
    expect(c.canViewReports).toBe(true)
    expect(c.canViewFinancials).toBe(true)
  })

  it('administrador tiene todo el establecimiento menos la auditoría', () => {
    const c = roleCapabilities('administrador')
    expect(c.canManageTeam).toBe(true)
    expect(c.canAssignSuperadmin).toBe(false)
    expect(c.canViewAudit).toBe(false)
    expect(c.canViewReports).toBe(true)
    expect(c.canViewFinancials).toBe(true)
  })

  it('tecnico no gestiona equipo pero sí satelital/reportes', () => {
    const c = roleCapabilities('tecnico')
    expect(c.canManageTeam).toBe(false)
    expect(c.canViewFinancials).toBe(false)
    expect(c.canViewAudit).toBe(false)
    expect(c.canViewReports).toBe(true)
    expect(c.canEditMaps).toBe(true)
    expect(c.canViewDecisions).toBe(true)
  })

  it('peon solo carga en modo campo', () => {
    const c = roleCapabilities('peon')
    expect(c.canManageTeam).toBe(false)
    expect(c.canViewReports).toBe(false)
    expect(c.canViewDecisions).toBe(false)
    expect(c.canEditMaps).toBe(false)
    expect(c.canViewFinancials).toBe(false)
    expect(c.canAccessFieldMode).toBe(true)
    expect(c.canAccessOperational).toBe(true)
  })

  it('rol desconocido no opera', () => {
    const c = roleCapabilities(null)
    expect(c.canAccessOperational).toBe(false)
    expect(c.canAccessFieldMode).toBe(false)
  })
})

describe('router — inventario de funcionalidades', () => {
  const flat = flattenRoutes(routes)

  it('incluye login, dashboard, field, lotes, recursos, satelital, reportes, profile, support', () => {
    const paths = flat.map((r) => r.path)
    for (const need of [
      '/login',
      '/',
      '/field',
      '/lotes',
      '/recursos',
      '/recursos/potreros',
      '/recursos/despensa',
      '/recursos/agua',
      '/recursos/lluvias',
      '/recursos/satelital',
      '/reportes',
      '/auditoria',
      '/alertas',
      '/profile',
      '/support',
      '/about',
      '/auth/callback',
    ]) {
      expect(paths.some((p) => p === need || p.startsWith(need + '/')), need).toBe(true)
    }
  })

  it('protege rutas técnicas y deja la auditoría al superadmin', () => {
    const sat = flat.find((r) => r.path.includes('satelital'))
    expect(sat?.requiresRole).toEqual(['superadmin', 'administrador', 'admin', 'tecnico'])
    const rep = flat.find((r) => r.path === '/reportes')
    expect(rep?.requiresRole).toEqual(['superadmin', 'administrador', 'admin', 'tecnico'])
    const aud = flat.find((r) => r.path === '/auditoria')
    expect(aud?.requiresRole).toEqual(['superadmin'])
    const despensa = flat.find((r) => r.path === '/recursos/despensa')
    expect(despensa?.requiresRole).toEqual(['superadmin', 'administrador', 'admin'])
  })

  it('matriz PROTECTED_ROUTE_ROLES alineada', () => {
    expect(PROTECTED_ROUTE_ROLES['/recursos/satelital']).toEqual([
      'superadmin',
      'administrador',
      'admin',
      'tecnico',
    ])
    expect(PROTECTED_ROUTE_ROLES['/reportes']).toEqual([
      'superadmin',
      'administrador',
      'admin',
      'tecnico',
    ])
    expect(PROTECTED_ROUTE_ROLES['/equipo']).toEqual(['superadmin', 'administrador', 'admin'])
    expect(PROTECTED_ROUTE_ROLES['/auditoria']).toEqual(['superadmin'])
  })

  it('equipo redirige a profile?tab=team', () => {
    const eq = flat.find((r) => r.path === '/equipo')
    expect(eq?.redirect).toBeTruthy()
  })
})
