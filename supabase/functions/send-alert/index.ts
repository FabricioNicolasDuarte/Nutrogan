// Archivo: supabase/functions/send-alert/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AlertPayload {
  titulo: string
  mensaje: string
  prioridad: 'normal' | 'urgente' | 'success'
  categoria: string
  destinatarios: { email: string; nombre: string }[]
  metadata?: {
    logo_url?: string
    footer_text?: string
  }
}

serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: AlertPayload = await req.json()
    const { titulo, mensaje, prioridad, destinatarios, metadata } = payload

    if (!destinatarios || destinatarios.length === 0) {
      return new Response(JSON.stringify({ message: 'Sin destinatarios' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 1. Determinar Color según Prioridad (Mismo esquema que el Frontend)
    let colorHeader = '#2196f3' // Azul (Normal)
    if (prioridad === 'urgente') colorHeader = '#d32f2f' // Rojo
    if (prioridad === 'success') colorHeader = '#4caf50' // Verde

    // 2. Construir HTML del Email
    // Usamos un diseño limpio que imita la tarjeta del Dashboard
    const logoUrl = metadata?.logo_url || 'https://tu-bucket.supabase.co/nutrogan-logo.png' // Reemplazar con URL real por defecto

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">

        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-bottom: 1px solid #ddd;">
           <img src="${logoUrl}" alt="Nutrogan" style="height: 40px; object-fit: contain;" />
        </div>

        <div style="background-color: ${colorHeader}; height: 6px; width: 100%;"></div>

        <div style="padding: 30px;">
          <h2 style="color: #333; margin-top: 0; font-size: 24px;">${titulo}</h2>

          <div style="color: #555; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
            ${mensaje}
          </div>

          <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #333; color: #666; font-size: 14px;">
            <strong>Categoría:</strong> ${payload.categoria.toUpperCase()}<br/>
            <strong>Prioridad:</strong> ${prioridad.toUpperCase()}
          </div>
        </div>

        <div style="background-color: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">${metadata?.footer_text || 'Sistema de Gestión Ganadera Nutrogan'}</p>
          <p style="margin: 5px 0 0;">Este es un mensaje automático. No responder.</p>
        </div>
      </div>
    `

    // 3. Enviar con Resend
    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Nutrogan Alertas <onboarding@resend.dev>', // Configura tu dominio verificado en prod
          to: destinatarios.map((d) => d.email),
          subject: `[Nutrogan] ${titulo}`,
          html: htmlContent,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Error en Resend')
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      return new Response(JSON.stringify({ success: false, error: 'Falta API Key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
