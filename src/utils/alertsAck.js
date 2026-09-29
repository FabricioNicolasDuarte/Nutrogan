/**
 * Persistencia local de alertas:
 * - ack: fingerprint de alertas activas ya revisadas (punto del notch)
 * - archive: ids archivadas/destildadas por establecimiento
 */

const ACK_KEY = 'nutrogan_alerts_ack_v1'
const ARCHIVE_KEY = 'nutrogan_alerts_archive_v1'

export function alertsFingerprint(alerts = []) {
  return [...alerts]
    .map((a) => a.id)
    .filter(Boolean)
    .sort()
    .join('|')
}

export function getAckedFingerprint() {
  try {
    return localStorage.getItem(ACK_KEY) || ''
  } catch {
    return ''
  }
}

export function ackAlerts(alerts = []) {
  try {
    localStorage.setItem(ACK_KEY, alertsFingerprint(alerts))
  } catch {
    /* ignore quota */
  }
}

/** Hay alertas nuevas (no archivadas) respecto a la última lectura en /alertas. */
export function hasUnreadAlerts(alerts = []) {
  if (!alerts.length) return false
  return alertsFingerprint(alerts) !== getAckedFingerprint()
}

function readArchiveMap() {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeArchiveMap(map) {
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function scopeKey(establecimientoId) {
  return establecimientoId ? String(establecimientoId) : 'default'
}

/** @returns {Record<string, { archivedAt: string, title?: string, severity?: string, message?: string }>} */
export function getArchivedMap(establecimientoId) {
  const all = readArchiveMap()
  const bucket = all[scopeKey(establecimientoId)]
  return bucket && typeof bucket === 'object' ? bucket : {}
}

export function getArchivedIds(establecimientoId) {
  return new Set(Object.keys(getArchivedMap(establecimientoId)))
}

export function archiveAlert(establecimientoId, alert) {
  if (!alert?.id) return
  const all = readArchiveMap()
  const key = scopeKey(establecimientoId)
  const bucket = { ...(all[key] || {}) }
  bucket[alert.id] = {
    archivedAt: new Date().toISOString(),
    title: alert.title || '',
    message: alert.message || '',
    severity: alert.severity || 'info',
    category: alert.category || '',
  }
  all[key] = bucket
  writeArchiveMap(all)
  window.dispatchEvent(new CustomEvent('alerts-archive-changed'))
}

export function archiveAlerts(establecimientoId, alerts = []) {
  if (!alerts.length) return
  const all = readArchiveMap()
  const key = scopeKey(establecimientoId)
  const bucket = { ...(all[key] || {}) }
  const now = new Date().toISOString()
  for (const alert of alerts) {
    if (!alert?.id) continue
    bucket[alert.id] = {
      archivedAt: now,
      title: alert.title || '',
      message: alert.message || '',
      severity: alert.severity || 'info',
      category: alert.category || '',
    }
  }
  all[key] = bucket
  writeArchiveMap(all)
  window.dispatchEvent(new CustomEvent('alerts-archive-changed'))
}

export function restoreAlert(establecimientoId, alertId) {
  if (!alertId) return
  const all = readArchiveMap()
  const key = scopeKey(establecimientoId)
  const bucket = { ...(all[key] || {}) }
  delete bucket[alertId]
  all[key] = bucket
  writeArchiveMap(all)
  window.dispatchEvent(new CustomEvent('alerts-archive-changed'))
}

export function clearArchived(establecimientoId) {
  const all = readArchiveMap()
  all[scopeKey(establecimientoId)] = {}
  writeArchiveMap(all)
  window.dispatchEvent(new CustomEvent('alerts-archive-changed'))
}

export function filterActiveAlerts(alerts = [], establecimientoId) {
  const archived = getArchivedIds(establecimientoId)
  return alerts.filter((a) => a?.id && !archived.has(a.id))
}

/** Semáforo visual Nutrogan (sin naranja). */
export function severityTraffic(severity) {
  if (severity === 'critical') {
    return { color: 'red-8', label: 'ROJO', icon: 'error' }
  }
  if (severity === 'warn') {
    return { color: 'yellow-8', label: 'AMARILLO', icon: 'warning', textColor: 'black' }
  }
  return { color: 'green-13', label: 'VERDE', icon: 'check_circle', textColor: 'black' }
}
