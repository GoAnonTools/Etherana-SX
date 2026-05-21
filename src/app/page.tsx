import ChatWindow from '@/components/ChatWindow';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Etherana SX',
  description: 'AI-powered answering engine for solo entrepreneurs.',
};

const Home = () => {
  return <ChatWindow />;
};

export default Home;
