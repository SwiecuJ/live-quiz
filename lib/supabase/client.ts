"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Public, browser-safe Supabase client (anon key). Used for realtime
 * subscriptions and the player-facing writes RLS explicitly allows
 * (joining a room, submitting an answer).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
