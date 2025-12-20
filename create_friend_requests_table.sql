-- Create friend_requests table
CREATE TABLE public.friend_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(sender_id, receiver_id)
);

-- Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Policies

-- View: Sender or Receiver can view their requests
CREATE POLICY "Users can view their friend requests" 
    ON public.friend_requests 
    FOR SELECT 
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Insert: Authenticated users can send requests
CREATE POLICY "Users can send friend requests" 
    ON public.friend_requests 
    FOR INSERT 
    WITH CHECK (auth.uid() = sender_id);

-- Update: Receiver can accept/reject (update status)
CREATE POLICY "Receiver can update friend request status" 
    ON public.friend_requests 
    FOR UPDATE 
    USING (auth.uid() = receiver_id);

-- Delete: Sender can cancel, Receiver can delete (optional, usually handled by update to rejected)
CREATE POLICY "Users can delete their friend requests" 
    ON public.friend_requests 
    FOR DELETE 
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
