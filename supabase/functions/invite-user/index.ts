import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Iniciar cliente con privilegios de ADMIN (Service Key)
    // Necesario para buscar usuarios por email
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { email, rol, establecimiento_id } = await req.json()

    if (!email || !establecimiento_id) {
      throw new Error('Faltan datos (email o establecimiento_id)')
    }

    // 2. Buscar el ID del usuario por su email
    // Nota: Esta función es administrativa
    const { data: users, error: searchError } = await supabaseAdmin.auth.admin.listUsers()

    // Filtramos manualmente porque listUsers no siempre permite filtrar por email directamente en todas las versiones
    const user = users.users.find((u) => u.email === email)

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Usuario no encontrado. Debe registrarse primero en la app.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 },
      )
    }

    // 3. Insertar en la tabla miembros_establecimiento
    const { error: insertError } = await supabaseAdmin.from('miembros_establecimiento').insert({
      usuario_id: user.id,
      establecimiento_id: establecimiento_id,
      rol: rol || 'operario',
    })

    if (insertError) {
      if (insertError.code === '23505') {
        // Unique violation
        throw new Error('Este usuario ya es miembro de este establecimiento.')
      }
      throw insertError
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Usuario invitado correctamente' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
