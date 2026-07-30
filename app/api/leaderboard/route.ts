import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TOP_N = 10;

/**
 * All-time ranking, summed per device across every game that actually
 * started. The grouping happens in the `global_scores` view (see
 * supabase/migrations/0002_device_identity.sql) so this doesn't have to
 * pull every player row ever created just to add them up.
 *
 * Device ids are internal, so only the display fields go out.
 */
export async function GET() {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("global_scores")
    .select("nickname, total_score, games_played")
    .order("total_score", { ascending: false })
    .limit(TOP_N);

  if (error) {
    // Most likely the 0002 migration hasn't been run yet. The home page
    // treats an empty list as "nothing to show" rather than breaking.
    console.error("leaderboard: failed to read global_scores", error);
    return NextResponse.json({ leaders: [] });
  }

  return NextResponse.json({ leaders: data ?? [] });
}
