/**
 * Matriz de permisos.
 * superadmin: todo, incluida la auditoría.
 * administrador: todo el establecimiento, sin auditoría.
 * tecnico: campo, sanidad, agua, mapas, reportes y decisiones. Sin equipo ni costos.
 * peon: solo carga de datos (modo campo).
 * admin y operario quedan como alias de los nombres anteriores.
 */

export const ROLES_GESTORES = ['superadmin', 'administrador', 'admin']
export const ROLES_TECNICOS = [...ROLES_GESTORES, 'tecnico']

export const ROLE_LABELS = {
  superadmin: 'Superadmin',
  administrador: 'Administrador',
  admin: 'Administrador',
  tecnico: 'Técnico',
  peon: 'Peón',
  operario: 'Peón',
}

export function roleCapabilities(role) {
  const isSuperadmin = role === 'superadmin'
  const isAdmin = ROLES_GESTORES.includes(role)
  const isTecnico = role === 'tecnico'
  const isPeon = role === 'peon' || role === 'operario'
  const known = isAdmin || isTecnico || isPeon

  return {
    isSuperadmin,
    isAdmin,
    isTecnico,
    isPeon,
    isOperario: isPeon,
    canManageTeam: isAdmin,
    canAssignSuperadmin: isSuperadmin,
    canViewAudit: isSuperadmin,
    canViewEstablishmentData: isAdmin,
    canViewFinancials: isAdmin,
    canConfigureEstablishment: isAdmin,
    canViewReports: isAdmin || isTecnico,
    canViewDecisions: isAdmin || isTecnico,
    canEditFieldStructure: isAdmin || isTecnico,
    canEditMaps: isAdmin || isTecnico,
    canViewEventHistory: isAdmin || isTecnico,
    canAccessOperational: known,
    canAccessFieldMode: known,
    canDeleteRecords: isAdmin || isTecnico,
  }
}

export const PROTECTED_ROUTE_ROLES = {
  '/recursos/potreros/draw': ROLES_TECNICOS,
  '/recursos/satelital': ROLES_TECNICOS,
  '/reportes': ROLES_TECNICOS,
  '/decisiones': ROLES_TECNICOS,
  '/equipo': ROLES_GESTORES,
  '/fundadores': ROLES_GESTORES,
  '/auditoria': ['superadmin'],
}
