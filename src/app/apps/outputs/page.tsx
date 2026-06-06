import { redirect } from 'next/navigation';

export default function AppOutputsRedirectPage() {
  redirect('/outputs?filter=apps');
}
