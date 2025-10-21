import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing url parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate URL to prevent SSRF attacks
    const parsedUrl = new URL(imageUrl);
    const allowedProtocols = ['http:', 'https:'];
    
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return new Response(
        JSON.stringify({ error: 'Invalid protocol' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Block internal/private IP ranges
    const hostname = parsedUrl.hostname;
    const blockedPatterns = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^localhost$/i,
      /^0\.0\.0\.0$/,
    ];

    if (blockedPatterns.some(pattern => pattern.test(hostname))) {
      return new Response(
        JSON.stringify({ error: 'Access to internal addresses is blocked' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Proxying image from: ${imageUrl}`);

    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Blaze-Image-Proxy/1.0',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch image' }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate content type
    const contentType = response.headers.get('content-type') || '';
    const allowedTypes = ['image/', 'video/'];
    
    if (!allowedTypes.some(type => contentType.startsWith(type))) {
      return new Response(
        JSON.stringify({ error: 'Invalid content type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Return the proxied image
    const imageData = await response.arrayBuffer();
    
    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });

  } catch (error) {
    console.error('Error proxying image:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to proxy image' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
