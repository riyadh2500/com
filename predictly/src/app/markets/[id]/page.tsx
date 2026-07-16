'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MarketDetailPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/crypto'); }, []);
  return null;
}
