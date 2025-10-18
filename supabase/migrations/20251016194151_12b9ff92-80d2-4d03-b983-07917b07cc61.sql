-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for question categories
CREATE TYPE public.question_category AS ENUM ('CT', 'Web3', 'News');

-- Create enum for blockchain networks
CREATE TYPE public.blockchain_chain AS ENUM ('solana', 'base');

-- Create enum for purchase status
CREATE TYPE public.purchase_status AS ENUM ('pending', 'confirmed', 'rejected');

-- Users table (extends auth with wallet info)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  chain public.blockchain_chain NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0 NOT NULL,
  tokens INTEGER DEFAULT 0 NOT NULL,
  last_play TIMESTAMP WITH TIME ZONE,
  total_wins INTEGER DEFAULT 0 NOT NULL,
  total_plays INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.question_category NOT NULL,
  text TEXT NOT NULL,
  options JSONB NOT NULL, -- {"A": "option1", "B": "option2", "C": "option3", "D": "option4"}
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  source_url TEXT,
  expiry_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Purchases table
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  chain public.blockchain_chain NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  session_id TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) DEFAULT 1.00 NOT NULL,
  status public.purchase_status DEFAULT 'pending' NOT NULL,
  tokens_credited INTEGER DEFAULT 0 NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Game history table
CREATE TABLE public.game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  wallet_address TEXT NOT NULL,
  questions_attempted INTEGER NOT NULL,
  questions_correct INTEGER NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('win', 'loss')),
  earnings DECIMAL(10,2) DEFAULT 0 NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Claims table
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  wallet_address TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  chain public.blockchain_chain NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (true); -- Public leaderboard visibility

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (wallet_address = current_setting('app.current_wallet', true));

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- RLS Policies for user_roles
CREATE POLICY "Anyone can view roles"
  ON public.user_roles FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(user_id, 'admin'));

-- RLS Policies for questions
CREATE POLICY "Anyone can view active questions"
  ON public.questions FOR SELECT
  USING (is_active = true AND expiry_date >= CURRENT_DATE);

CREATE POLICY "Admins can manage questions"
  ON public.questions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON u.id = ur.user_id
    WHERE ur.role = 'admin'
  ));

-- RLS Policies for purchases
CREATE POLICY "Users can view their own purchases"
  ON public.purchases FOR SELECT
  USING (wallet_address = current_setting('app.current_wallet', true));

CREATE POLICY "Anyone can create purchases"
  ON public.purchases FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update purchases"
  ON public.purchases FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON u.id = ur.user_id
    WHERE ur.role = 'admin'
  ));

-- RLS Policies for game_history
CREATE POLICY "Users can view their own history"
  ON public.game_history FOR SELECT
  USING (wallet_address = current_setting('app.current_wallet', true));

CREATE POLICY "Users can view leaderboard"
  ON public.game_history FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert game history"
  ON public.game_history FOR INSERT
  WITH CHECK (true);

-- RLS Policies for claims
CREATE POLICY "Users can view their own claims"
  ON public.claims FOR SELECT
  USING (wallet_address = current_setting('app.current_wallet', true));

CREATE POLICY "Users can create claims"
  ON public.claims FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update claims"
  ON public.claims FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON u.id = ur.user_id
    WHERE ur.role = 'admin'
  ));

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed some initial questions for testing
INSERT INTO public.questions (category, text, options, correct_answer, source_url, expiry_date) VALUES
  ('CT', 'What does "GM" stand for in crypto Twitter?', '{"A": "Good Morning", "B": "Great Market", "C": "Get Money", "D": "Global Markets"}', 'A', 'https://twitter.com', '2026-12-31'),
  ('Web3', 'Which blockchain is known for its proof-of-stake consensus?', '{"A": "Bitcoin", "B": "Ethereum 2.0", "C": "Litecoin", "D": "Dogecoin"}', 'B', 'https://ethereum.org', '2026-12-31'),
  ('News', 'What year did Bitcoin reach its first all-time high above $60k?', '{"A": "2019", "B": "2020", "C": "2021", "D": "2022"}', 'C', 'https://coinmarketcap.com', '2026-12-31'),
  ('CT', 'What does WAGMI mean?', '{"A": "We Are Going Much Insane", "B": "We All Gonna Make It", "C": "Waiting And Getting Money In", "D": "Web Analytics Got Me Interested"}', 'B', 'https://twitter.com', '2026-12-31'),
  ('Web3', 'What is the native token of Solana?', '{"A": "ETH", "B": "BTC", "C": "SOL", "D": "ADA"}', 'C', 'https://solana.com', '2026-12-31'),
  ('News', 'Which company was the first to add Bitcoin to its corporate treasury in 2020?', '{"A": "Tesla", "B": "MicroStrategy", "C": "Square", "D": "PayPal"}', 'B', 'https://news.bitcoin.com', '2026-12-31');