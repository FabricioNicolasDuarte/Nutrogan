import { describe, expect, it, beforeEach } from 'vitest'
import {
  ackAlerts,
  alertsFingerprint,
  hasUnreadAlerts,
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
})
