import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminChatManager from '@/components/chat/AdminChatManager';

export default async function AdminChatPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as any).id) {
    redirect('/login');
  }

  const userId = (session.user as any).id;

  return <AdminChatManager adminId={userId} />;
}