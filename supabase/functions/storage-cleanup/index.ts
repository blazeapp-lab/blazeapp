import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      throw new Error('Admin access required');
    }

    const { action, bucket, prefix, files } = await req.json();
    
    console.log(`Storage cleanup action: ${action}`);

    switch (action) {
      case 'list_buckets': {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ buckets }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list_files': {
        if (!bucket) throw new Error('Bucket name required');
        
        const { data: files, error } = await supabase.storage
          .from(bucket)
          .list(prefix || '', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
        
        if (error) throw error;

        return new Response(
          JSON.stringify({ files }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_bucket_size': {
        if (!bucket) throw new Error('Bucket name required');
        
        let totalSize = 0;
        let fileCount = 0;
        
        // List all files recursively
        const listAllFiles = async (bucketName: string, path = '') => {
          const { data: files, error } = await supabase.storage
            .from(bucketName)
            .list(path, { limit: 1000 });
          
          if (error) throw error;
          
          for (const file of files || []) {
            if (file.id) {
              // It's a file
              totalSize += file.metadata?.size || 0;
              fileCount++;
            } else {
              // It's a folder, recurse
              await listAllFiles(bucketName, `${path}${file.name}/`);
            }
          }
        };
        
        await listAllFiles(bucket);
        
        return new Response(
          JSON.stringify({ totalSize, fileCount }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_files': {
        if (!bucket || !files || !Array.isArray(files)) {
          throw new Error('Bucket and files array required');
        }
        
        const { data, error } = await supabase.storage
          .from(bucket)
          .remove(files);
        
        if (error) throw error;

        console.log(`Deleted ${files.length} files from ${bucket}`);
        
        return new Response(
          JSON.stringify({ success: true, deletedCount: files.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_old_files': {
        if (!bucket) throw new Error('Bucket name required');
        
        const daysOld = 30; // Delete files older than 30 days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        let deletedCount = 0;
        
        const deleteOldFilesRecursive = async (bucketName: string, path = '') => {
          const { data: files, error } = await supabase.storage
            .from(bucketName)
            .list(path, { limit: 1000 });
          
          if (error) throw error;
          
          const filesToDelete: string[] = [];
          
          for (const file of files || []) {
            if (file.id) {
              const fileDate = new Date(file.created_at);
              if (fileDate < cutoffDate) {
                filesToDelete.push(`${path}${file.name}`);
              }
            } else {
              await deleteOldFilesRecursive(bucketName, `${path}${file.name}/`);
            }
          }
          
          if (filesToDelete.length > 0) {
            const { error: deleteError } = await supabase.storage
              .from(bucketName)
              .remove(filesToDelete);
            
            if (deleteError) throw deleteError;
            deletedCount += filesToDelete.length;
          }
        };
        
        await deleteOldFilesRecursive(bucket);
        
        console.log(`Deleted ${deletedCount} old files from ${bucket}`);
        
        return new Response(
          JSON.stringify({ success: true, deletedCount }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Storage cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
