export type AccountType = 'cash' | 'bank' | 'credit_card' | 'crypto' | 'other';
export type IncomeFrequency = 'one_time' | 'weekly' | 'biweekly' | 'monthly';
export type GoalStatus = 'active' | 'achieved' | 'archived';

export interface Profile {
  id: string;
  base_currency: string;
  weight_urgency: number;
  weight_importance: number;
  weight_roi: number;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  type: AccountType;
  name: string;
  balance: number;
  currency: string;
  is_debt: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CryptoHolding {
  id: string;
  user_id: string;
  account_id: string | null;
  symbol: string;
  amount: number;
  source: 'binance' | 'manual';
  last_price_usd: number | null;
  last_synced_at: string | null;
  created_at: string;
}

export interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: IncomeFrequency;
  next_date: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  urgency: number;
  importance: number;
  roi: number;
  position: number;
  status: GoalStatus;
  achieved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FxRate {
  base: string;
  quote: string;
  rate: number;
  fetched_at: string;
}

export interface BinanceCredential {
  user_id: string;
  api_key_encrypted: string;
  api_secret_encrypted: string;
  last_synced_at: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      accounts: {
        Row: Account;
        Insert: Omit<Account, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Account>;
      };
      crypto_holdings: {
        Row: CryptoHolding;
        Insert: Omit<CryptoHolding, 'id' | 'created_at'> & { id?: string };
        Update: Partial<CryptoHolding>;
      };
      income_sources: {
        Row: IncomeSource;
        Insert: Omit<IncomeSource, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<IncomeSource>;
      };
      goals: {
        Row: Goal;
        Insert: Omit<Goal, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Goal>;
      };
      fx_rates: { Row: FxRate; Insert: FxRate; Update: Partial<FxRate> };
      binance_credentials: {
        Row: BinanceCredential;
        Insert: BinanceCredential;
        Update: Partial<BinanceCredential>;
      };
    };
  };
}
