"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <button
      onClick={logout}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
    >
      Logout
    </button>
  );
}
