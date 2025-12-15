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
    app_url?: string // Nueva opción para redirigir al usuario
  }
}

serve(async (req) => {
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

    // Colores corporativos según urgencia
    const colors = {
      urgente: '#d32f2f', // Rojo
      success: '#2e7d32', // Verde
      normal: '#1976d2', // Azul
      default: '#333333',
    }
    const colorHeader = colors[prioridad] || colors.default

    const logoUrl = metadata?.logo_url || 'https://tu-bucket.supabase.co/nutrogan-logo.png'
    const appUrl = metadata?.app_url || 'https://app.nutrogan.com' // Cambia esto por tu URL real

    // HTML PROFESIONAL LIMPIO
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">

        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

          <div style="height: 4px; background-color: ${colorHeader}; width: 100%;"></div>

          <div style="padding: 30px 40px; text-align: center; border-bottom: 1px solid #f0f0f0;">
             <img src="${logoUrl}" alt="Nutrogan" style="height: 32px; object-fit: contain;" />
          </div>

          <div style="padding: 40px 40px 20px 40px;">
            <h1 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;">${titulo}</h1>

            <div style="color: #374151; font-size: 16px; line-height: 1.6; white-space: pre-wrap; margin-top: 20px;">
              ${mensaje}
            </div>
          </div>

          <div style="padding: 20px 40px 40px 40px; text-align: center;">
             <a href="${appUrl}" style="display: inline-block; padding: 12px 24px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
                Ir al Panel de Control
             </a>
          </div>

          <div style="background-color: #fafafa; padding: 30px; text-align: center; border-top: 1px solid #f0f0f0;">
            <p style="margin: 0; color: #71717a; font-size: 12px;">
              © ${new Date().getFullYear()} Nutrogan Systems. Todos los derechos reservados.
            </p>
            <p style="margin: 10px 0 0; color: #a1a1aa; font-size: 11px; line-height: 1.4;">
              Estás recibiendo este correo porque formas parte del equipo operativo del establecimiento.
              <br/>
              Si crees que es un error, contacta al administrador.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Nutrogan Alertas <onboarding@resend.dev>',
          to: destinatarios.map((d) => d.email),
          subject: `${titulo}`, // Asunto limpio sin etiquetas
          html: htmlContent,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Error en Resend')

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
