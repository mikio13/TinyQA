import { NextRequest, NextResponse } from "next/server";
import { mapRunRow } from "@/lib/runs";
import { createClient } from "@/lib/supabase/server";
import type { RunListResponse } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload: RunListResponse = {
    runs: (data ?? []).map((row) => mapRunRow(row)),
  };

  return NextResponse.json(payload);
}
