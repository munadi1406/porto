'use client';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className='card p-8 text-center'>
      <AlertTriangle className='w-8 h-8 mx-auto text-destructive mb-3' />
      <h2 className='font-bold'>Something went wrong</h2>
      <p className='text-sm text-muted-foreground mt-1'>{error.message || 'Unexpected error'}</p>
      <div className='flex justify-center gap-2 mt-4'>
        <button onClick={reset} className='inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold'><RefreshCw className='w-4 h-4' />Try again</button>
        <Link href='/' className='inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-bold'><Home className='w-4 h-4' />Home</Link>
      </div>
    </div>
  );
}
