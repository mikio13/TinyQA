import { NextRequest, NextResponse } from "next/server";
import { mapRunRow } from "@/lib/runs";
import { createClient } from "@/lib/supabase/server";
import type { RunListResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const source = searchParams.get("source");
  const status = searchParams.get("status");

  let query = supabase
    .from("runs")
    .select("*")
    .order("created_at", { ascending: false });

  if (projectId) query = query.eq("project_id", projectId);
  if (source) query = query.eq("source", source);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload: RunListResponse = {
    runs: (data ?? []).map((row) => mapRunRow(row)),
  };

  return NextResponse.json(payload);
}
