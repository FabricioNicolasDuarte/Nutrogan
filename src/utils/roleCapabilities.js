/**
 * Matriz de permisos por rol (fuente única para UI/router tests).
 * Roles: admin | tecnico | operario
 */

export function roleCapabilities(role) {
  const isAdmin = role === 'admin'
  const isTecnico = role === 'tecnico'
  const isOperario = role === 'operario'
  const known = isAdmin || isTecnico || isOperario

  return {
    isAdmin,
    isTecnico,
    isOperario,
    canManageTeam: isAdmin,
    canViewEstablishmentData: isAdmin,
    canViewFinancials: isAdmin,
    canConfigureEstablishment: isAdmin,
    canViewReports: isAdmin || isTecnico,
    canEditFieldStructure: isAdmin || isTecnico,
    canEditMaps: isAdmin || isTecnico,
    canViewEventHistory: isAdmin || isTecnico,
    canAccessOperational: known,
    canAccessFieldMode: known,
  }
}

/** Rutas con meta.requiresRole (debe coincidir con router/routes.js). */
export const PROTECTED_ROUTE_ROLES = {
  '/recursos/potreros/draw': ['admin', 'tecnico'],
  '/recursos/satelital': ['admin', 'tecnico'],
  '/reportes': ['admin', 'tecnico'],
  '/equipo': ['admin'],
  '/fundadores': ['admin'],
}
