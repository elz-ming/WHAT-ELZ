import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export async function GET() {
  const { userId } = await auth();
  if (userId) {
    await supabaseAdmin
      .from('system_config')
      .upsert({ key: 'clerk_admin_user_id', value: userId });
  }
  redirect('/admin');
}
