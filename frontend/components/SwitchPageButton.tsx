'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftRight } from 'lucide-react';

export default function SwitchPageButton() {
  const pathname = usePathname();
  const target = pathname.startsWith('/rag') ? '/library' : '/rag';
  const label = pathname.startsWith('/rag') ? 'Go to Library' : 'Go to RAG';

  return (
    <Link
      href={target}
      className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-white shadow-md transition-transform hover:scale-105 hover:bg-green-700"
    >
      <ArrowLeftRight className="h-4 w-4" />
      {label}
    </Link>
  );
}
