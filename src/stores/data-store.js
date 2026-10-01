import { defineStore } from 'pinia'
import { supabase } from 'boot/supabase'
import { useAuthStore } from './auth-store'
import { createCrudModule } from './data/crud'
import { createEstablecimientoModule } from './data/establecimiento'
import { createLotesModule } from './data/lotes'
import { createInventarioModule } from './data/inventario'
import { createAguaModule } from './data/agua'
import { createEquipoModule } from './data/equipo'
import { createNotificacionesModule } from './data/notificaciones'
import { createClimaModule } from './data/clima'

export const useDataStore = defineStore(
  'data',
  () => {
    const authStore = useAuthStore()
    const bag = {}
    const ctx = { supabase, authStore, bag }

    const crud = createCrudModule(ctx)
    Object.assign(bag, createEstablecimientoModule(ctx))
    Object.assign(bag, createLotesModule({ ...ctx, crud }))
    Object.assign(bag, createInventarioModule({ ...ctx, crud }))
    Object.assign(bag, createAguaModule({ ...ctx, crud }))
    Object.assign(bag, createEquipoModule(ctx))
    Object.assign(bag, createNotificacionesModule(ctx))
    Object.assign(bag, createClimaModule(ctx))

    async function fetchAll() {
      if (!authStore.profile) return

      bag.listenToPotreroChanges()

      await bag.fetchEstablecimiento()
      await bag.fetchPotreros()
      await bag.fetchLotes()

      if (bag.marketPrice.value.mode === 'auto') {
        bag.fetchMarketPriceAuto()
      }

      await Promise.all([
        bag.fetchInventarioItems(),
        bag.fetchFuentesAgua(),
        bag.fetchDietas(),
        bag.fetchMovimientos(),
        bag.fetchMiembrosEquipo(),
        bag.fetchNotifications(),
        bag.fetchInventarioMovimientos(),
        bag.fetchRegistrosLluvia(),
        bag.fetchAllEvaluaciones(),
      ])
    }

    return {
      lotes: bag.lotes,
      potreros: bag.potreros,
      fuentesAgua: bag.fuentesAgua,
      registrosLluvia: bag.registrosLluvia,
      dietas: bag.dietas,
      clima: bag.clima,
      movimientos: bag.movimientos,
      inventarioItems: bag.inventarioItems,
      inventarioMovimientos: bag.inventarioMovimientos,
      miembrosEquipo: bag.miembrosEquipo,
      notifications: bag.notifications,
      loteActual: bag.loteActual,
      evaluaciones: bag.evaluaciones,
      eventosSanitarios: bag.eventosSanitarios,
      eventosReproductivos: bag.eventosReproductivos,
      consumos: bag.consumos,
      establecimientoActual: bag.establecimientoActual,

      marketPrice: bag.marketPrice,
      setManualPrice: bag.setManualPrice,
      fetchMarketPriceAuto: bag.fetchMarketPriceAuto,
      setCategoriaPreferida: bag.setCategoriaPreferida,

      getPotreroById: bag.getPotreroById,
      fetchEstablecimiento: bag.fetchEstablecimiento,
      fetchAll,
      fetchLotes: bag.fetchLotes,
      fetchPotreros: bag.fetchPotreros,
      fetchMovimientos: bag.fetchMovimientos,
      fetchInventarioItems: bag.fetchInventarioItems,
      fetchInventarioMovimientos: bag.fetchInventarioMovimientos,
      fetchFuentesAgua: bag.fetchFuentesAgua,
      fetchRegistrosLluvia: bag.fetchRegistrosLluvia,
      fetchDietas: bag.fetchDietas,
      fetchMiembrosEquipo: bag.fetchMiembrosEquipo,
      invitarMiembro: bag.invitarMiembro,
      updateMiembroRol: bag.updateMiembroRol,
      removeMiembro: bag.removeMiembro,
      updatePerfilMiembro: bag.updatePerfilMiembro,
      fetchNotifications: bag.fetchNotifications,
      createNotification: bag.createNotification,
      deleteNotification: bag.deleteNotification,
      fetchClima: bag.fetchClima,
      fetchLoteDetalle: bag.fetchLoteDetalle,
      fetchEvaluaciones: bag.fetchEvaluaciones,
      fetchEventosSanitarios: bag.fetchEventosSanitarios,
      fetchEventosReproductivos: bag.fetchEventosReproductivos,
      fetchConsumos: bag.fetchConsumos,
      fetchAllEvaluaciones: bag.fetchAllEvaluaciones,
      fetchAllEventosSanitarios: bag.fetchAllEventosSanitarios,
      fetchAllEventosReproductivos: bag.fetchAllEventosReproductivos,
      fetchAllConsumos: bag.fetchAllConsumos,
      createRegistro: crud.createRegistro,
      updateRegistro: crud.updateRegistro,
      deactivateRegistro: crud.deactivateRegistro,
      moverLote: bag.moverLote,
      moverLoteACorral: bag.moverLoteACorral,
      getGDPV: bag.getGDPV,
      agregarAnalisisDeAgua: bag.agregarAnalisisDeAgua,
      createFuenteAgua: bag.createFuenteAgua,
      updateFuenteAgua: bag.updateFuenteAgua,
      deleteFuenteAgua: bag.deleteFuenteAgua,
      registrarMovimientoInventario: bag.registrarMovimientoInventario,
      createInventarioItem: bag.createInventarioItem,
      updateInventarioItem: bag.updateInventarioItem,
      deleteInventarioItem: bag.deleteInventarioItem,
      updateConfigEmergencia: bag.updateConfigEmergencia,
    }
  },
  {
    persist: {
      key: 'nutrogan_offline_data',
      pick: [
        'lotes',
        'potreros',
        'inventarioItems',
        'miembrosEquipo',
        'fuentesAgua',
        'establecimientoActual',
        'dietas',
        'marketPrice',
      ],
    },
  },
)
