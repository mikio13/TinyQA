import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-4 text-white/60 text-sm">
      <span>{user.email}</span>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Link
        href="/auth/login"
        className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        Sign in
      </Link>
      <Link
        href="/auth/sign-up"
        className="rounded-lg bg-white/10 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
      >
        Sign up
      </Link>
    </div>
  );
}
