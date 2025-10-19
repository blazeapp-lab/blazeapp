import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerHour: number
  blockDurationMinutes: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  requestsPerMinute: 10,
  requestsPerHour: 100,
  blockDurationMinutes: 60
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { endpoint } = await req.json()
    
    // Get real IP from headers (Cloudflare, proxy, etc.)
    const ip = req.headers.get('cf-connecting-ip') || 
               req.headers.get('x-real-ip') || 
               req.headers.get('x-forwarded-for')?.split(',')[0] ||
               'unknown'

    console.log(`Rate limit check for IP: ${ip}, endpoint: ${endpoint}`)

    // Check if IP is already blocked
    const { data: blocked } = await supabaseClient
      .from('rate_limit_logs')
      .select('id, created_at')
      .eq('ip_address', ip)
      .eq('is_blocked', true)
      .gte('created_at', new Date(Date.now() - DEFAULT_CONFIG.blockDurationMinutes * 60 * 1000).toISOString())
      .maybeSingle()

    if (blocked) {
      console.log(`IP ${ip} is currently blocked`)
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: 'IP temporarily blocked due to rate limit violation',
          retryAfter: DEFAULT_CONFIG.blockDurationMinutes * 60
        }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Count requests in last minute
    const { count: minuteCount } = await supabaseClient
      .from('rate_limit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .eq('endpoint', endpoint)
      .gte('created_at', oneMinuteAgo.toISOString())

    // Count requests in last hour
    const { count: hourCount } = await supabaseClient
      .from('rate_limit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .eq('endpoint', endpoint)
      .gte('created_at', oneHourAgo.toISOString())

    console.log(`IP ${ip} requests - Last minute: ${minuteCount}, Last hour: ${hourCount}`)

    // Check if rate limit exceeded
    if ((minuteCount || 0) >= DEFAULT_CONFIG.requestsPerMinute || 
        (hourCount || 0) >= DEFAULT_CONFIG.requestsPerHour) {
      
      // Block the IP
      await supabaseClient
        .from('rate_limit_logs')
        .insert({
          ip_address: ip,
          endpoint: endpoint,
          request_count: (minuteCount || 0) + 1,
          is_blocked: true,
          window_start: now.toISOString()
        })

      console.log(`IP ${ip} blocked for exceeding rate limit`)
      
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: 'Rate limit exceeded',
          retryAfter: DEFAULT_CONFIG.blockDurationMinutes * 60
        }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log the request
    await supabaseClient
      .from('rate_limit_logs')
      .insert({
        ip_address: ip,
        endpoint: endpoint,
        request_count: 1,
        window_start: now.toISOString()
      })

    return new Response(
      JSON.stringify({ allowed: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Rate limit check error:', error)
    // On error, allow the request (fail open)
    return new Response(
      JSON.stringify({ allowed: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
