import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminChatRoom from '@/components/chat/AdminChatRoom';

export default async function AdminChatRoomPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as any).id) {
    redirect('/login');
  }

  const userId = (session.user as any).id;
  const { conversationId } = await params;

  return (
    <AdminChatRoom 
      conversationId={conversationId} 
      adminId={userId} 
    />
  );
}