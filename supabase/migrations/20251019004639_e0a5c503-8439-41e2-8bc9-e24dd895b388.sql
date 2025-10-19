-- Fix critical security vulnerabilities in RLS policies
-- These tables were publicly readable, exposing sensitive user interaction data

-- 1. FIX LIKES TABLE
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;

-- Create restricted policy: users can only see their own likes
CREATE POLICY "Users can view their own likes"
  ON public.likes
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. FIX BROKEN_HEARTS TABLE
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Broken hearts are viewable by everyone" ON public.broken_hearts;

-- Create restricted policy: users can only see their own broken hearts
CREATE POLICY "Users can view their own broken hearts"
  ON public.broken_hearts
  FOR SELECT
  USING (auth.uid() = user_id);

-- 3. FIX COMMENT_LIKES TABLE
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Comment likes are viewable by everyone" ON public.comment_likes;

-- Create restricted policy: users can only see their own comment likes
CREATE POLICY "Users can view their own comment likes"
  ON public.comment_likes
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. FIX REPOSTS TABLE
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Reposts are viewable by everyone" ON public.reposts;

-- Create restricted policy: users can only see their own reposts
CREATE POLICY "Users can view their own reposts"
  ON public.reposts
  FOR SELECT
  USING (auth.uid() = user_id);

-- 5. FIX POST_VIEWS TABLE
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Post views are viewable by everyone" ON public.post_views;

-- Create restricted policy: users can only see views on their own posts
CREATE POLICY "Users can view their own post views"
  ON public.post_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_views.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- 6. FIX FOLLOWS TABLE
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;

-- Create restricted policy: users can see their own follows and who follows them
CREATE POLICY "Users can view their own follow relationships"
  ON public.follows
  FOR SELECT
  USING (
    auth.uid() = follower_id OR auth.uid() = following_id
  );