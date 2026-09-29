/** Persistencia local: qué set de alertas el usuario ya revisó. */

const ACK_KEY = 'nutrogan_alerts_ack_v1'

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

/** Hay alertas nuevas respecto a la última lectura en /alertas. */
export function hasUnreadAlerts(alerts = []) {
  if (!alerts.length) return false
  return alertsFingerprint(alerts) !== getAckedFingerprint()
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
