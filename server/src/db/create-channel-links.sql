-- Migration: Create channel_links table for WhatsApp/Telegram integrations
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS channel_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL, -- 'whatsapp' or 'telegram'
  channel_name TEXT,
  channel_id TEXT,
  phone_number TEXT,
  api_key TEXT,
  webhook_url TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'active', 'inactive', 'error'
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE channel_links ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin full access on channel_links" ON channel_links
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Agents can read
CREATE POLICY "Agents can read channel_links" ON channel_links
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'agent'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_channel_links_channel ON channel_links(channel);
CREATE INDEX IF NOT EXISTS idx_channel_links_status ON channel_links(status);
