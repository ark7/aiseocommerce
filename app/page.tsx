import { redirect } from 'next/navigation';

// Root page redirects to login
// In production, you might want to redirect to a specific store domain
// or implement a store selection page

export default function Home() {
  redirect('/login');
}
