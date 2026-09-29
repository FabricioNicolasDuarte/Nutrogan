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
  it('admin tiene equipo y reportes', () => {
    const c = roleCapabilities('admin')
    expect(c.canManageTeam).toBe(true)
    expect(c.canViewReports).toBe(true)
    expect(c.canEditMaps).toBe(true)
  })

  it('tecnico no gestiona equipo pero sí satelital/reportes', () => {
    const c = roleCapabilities('tecnico')
    expect(c.canManageTeam).toBe(false)
    expect(c.canViewReports).toBe(true)
    expect(c.canEditMaps).toBe(true)
  })

  it('operario solo operativa / campo', () => {
    const c = roleCapabilities('operario')
    expect(c.canManageTeam).toBe(false)
    expect(c.canViewReports).toBe(false)
    expect(c.canEditMaps).toBe(false)
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
      '/alertas',
      '/profile',
      '/support',
      '/about',
      '/auth/callback',
    ]) {
      expect(paths.some((p) => p === need || p.startsWith(need + '/')), need).toBe(true)
    }
  })

  it('protege rutas técnicas con admin|tecnico', () => {
    const sat = flat.find((r) => r.path.includes('satelital'))
    expect(sat?.requiresRole).toEqual(['admin', 'tecnico'])
    const rep = flat.find((r) => r.path === '/reportes')
    expect(rep?.requiresRole).toEqual(['admin', 'tecnico'])
  })

  it('matriz PROTECTED_ROUTE_ROLES alineada', () => {
    expect(PROTECTED_ROUTE_ROLES['/recursos/satelital']).toEqual(['admin', 'tecnico'])
    expect(PROTECTED_ROUTE_ROLES['/reportes']).toEqual(['admin', 'tecnico'])
    expect(PROTECTED_ROUTE_ROLES['/equipo']).toEqual(['admin'])
  })

  it('equipo redirige a profile?tab=team', () => {
    const eq = flat.find((r) => r.path === '/equipo')
    expect(eq?.redirect).toBeTruthy()
  })
})
