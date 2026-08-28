import { Skeleton } from '@/components/Skeleton';
export default function Loading() {
  return (
    <div className='space-y-3'>
      <div className='h-6 w-32 bg-muted animate-pulse rounded' />
      <div className='card p-4 space-y-3'>
        <div className='h-4 w-full bg-muted animate-pulse rounded' />
        <div className='h-32 bg-muted animate-pulse rounded' />
        <div className='h-10 bg-muted animate-pulse rounded' />
      </div>
    </div>
  );
}
