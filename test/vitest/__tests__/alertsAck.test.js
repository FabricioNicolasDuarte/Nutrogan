import { describe, expect, it, beforeEach } from 'vitest'
import {
  ackAlerts,
  alertsFingerprint,
  archiveAlert,
  archiveAlerts,
  clearArchived,
  filterActiveAlerts,
  getArchivedIds,
  hasUnreadAlerts,
  restoreAlert,
  severityTraffic,
} from 'src/utils/alertsAck'

describe('alertsAck', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('fingerprint estable e independiente del orden', () => {
    expect(alertsFingerprint([{ id: 'b' }, { id: 'a' }])).toBe(
      alertsFingerprint([{ id: 'a' }, { id: 'b' }]),
    )
  })

  it('sin ack → unread; tras ack → leído', () => {
    const alerts = [{ id: 'x' }, { id: 'y' }]
    expect(hasUnreadAlerts(alerts)).toBe(true)
    ackAlerts(alerts)
    expect(hasUnreadAlerts(alerts)).toBe(false)
  })

  it('alerta nueva vuelve a unread', () => {
    ackAlerts([{ id: 'a' }])
    expect(hasUnreadAlerts([{ id: 'a' }, { id: 'b' }])).toBe(true)
  })

  it('semáforo sin naranja', () => {
    expect(severityTraffic('critical').color).toBe('red-8')
    expect(severityTraffic('warn').color).toBe('yellow-8')
    expect(severityTraffic('info').color).toBe('green-13')
  })

  it('archivar / restaurar filtra activas por establecimiento', () => {
    const est = 'est-1'
    const all = [
      { id: 'agua-1', title: 'Agua', severity: 'critical' },
      { id: 'ndvi-1', title: 'NDVI', severity: 'warn' },
    ]
    archiveAlert(est, all[0])
    expect([...getArchivedIds(est)]).toEqual(['agua-1'])
    expect(filterActiveAlerts(all, est).map((a) => a.id)).toEqual(['ndvi-1'])

    restoreAlert(est, 'agua-1')
    expect(filterActiveAlerts(all, est)).toHaveLength(2)
  })

  it('archivar todas y vaciar', () => {
    const est = 'est-2'
    const all = [{ id: 'a' }, { id: 'b' }]
    archiveAlerts(est, all)
    expect(filterActiveAlerts(all, est)).toHaveLength(0)
    clearArchived(est)
    expect(filterActiveAlerts(all, est)).toHaveLength(2)
  })
})
