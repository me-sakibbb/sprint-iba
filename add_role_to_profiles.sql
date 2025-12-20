ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'operator'));
