import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    })

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Only admins can delete all posts' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Use service role client for deletions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Delete all related data first
    await supabaseAdmin.from('broken_hearts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('likes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('reposts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('post_views').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('comments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    // Finally delete all posts
    const { error: deleteError } = await supabaseAdmin.from('posts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (deleteError) {
      throw deleteError
    }

    return new Response(JSON.stringify({ success: true, message: 'All posts deleted' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})