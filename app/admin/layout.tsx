import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { AdminNavInjector } from "@/components/admin/AdminNavInjector";
import { supabaseAdmin } from "@/lib/supabase-server";
import { notFound } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const { data } = await supabaseAdmin
    .from("system_config")
    .select("value")
    .eq("key", "clerk_admin_user_id")
    .single();

  if (!userId || !data?.value || userId !== data.value) {
    notFound();
  }

  return (
    <ClerkProvider>
      <AdminNavInjector />
      <div className="mx-auto max-w-5xl px-6 py-6">
        {children}
      </div>
    </ClerkProvider>
  );
}
