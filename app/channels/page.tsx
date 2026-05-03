import { listChannels } from '@/lib/channels';
import { ChannelsPageClient } from './ChannelsPageClient';

export default async function ChannelsPage() {
  const channels = await listChannels(true);
  return <ChannelsPageClient channels={channels} />;
}
