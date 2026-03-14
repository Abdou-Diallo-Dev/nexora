import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default function Page() {
  redirect('/auth/login');
}