import ChatWindow from '@/components/ChatWindow';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search - Etherana SX',
  description: 'Search, research, and run agent workflows.',
};

const SearchPage = () => {
  return <ChatWindow />;
};

export default SearchPage;
