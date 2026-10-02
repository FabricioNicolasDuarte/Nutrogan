import localforage from 'localforage'

const db = localforage.createInstance({
  name: 'nutrogan',
  storeName: 'vision_pendiente',
})
const KEY = 'propuestas'

async function leer() {
  return (await db.getItem(KEY)) || []
}

export async function listarPropuestasVision() {
  return leer()
}

export async function guardarPropuestaPendiente(item) {
  const todas = await leer()
  const sinEsta = todas.filter((row) => row.id !== item.id)
  sinEsta.unshift({ ...item, creada: new Date().toISOString() })
  await db.setItem(KEY, sinEsta)
  window.dispatchEvent(new CustomEvent('vision-propuesta'))
  return sinEsta
}

export async function quitarPropuestaVision(id) {
  const todas = (await leer()).filter((row) => row.id !== id)
  await db.setItem(KEY, todas)
  window.dispatchEvent(new CustomEvent('vision-propuesta'))
}
