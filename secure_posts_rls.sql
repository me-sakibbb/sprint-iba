-- Enable Row Level Security on posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Policy to allow everyone to view posts
CREATE POLICY "Public posts are viewable by everyone" 
ON public.posts FOR SELECT 
USING (true);

-- Policy to allow authenticated users to insert posts
CREATE POLICY "Users can insert their own posts" 
ON public.posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy to allow authors to update their own posts
CREATE POLICY "Users can update their own posts" 
ON public.posts FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy to allow authors to delete their own posts
CREATE POLICY "Users can delete their own posts" 
ON public.posts FOR DELETE 
USING (auth.uid() = user_id);


-- Enable Row Level Security on comments table
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policy to allow everyone to view comments
CREATE POLICY "Public comments are viewable by everyone" 
ON public.comments FOR SELECT 
USING (true);

-- Policy to allow authenticated users to insert comments
CREATE POLICY "Users can insert their own comments" 
ON public.comments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy to allow authors to update their own comments
CREATE POLICY "Users can update their own comments" 
ON public.comments FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy to allow authors to delete their own comments
CREATE POLICY "Users can delete their own comments" 
ON public.comments FOR DELETE 
USING (auth.uid() = user_id);
