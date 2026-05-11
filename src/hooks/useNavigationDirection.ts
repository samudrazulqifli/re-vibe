"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useNavigationDirection() {
  const pathname = usePathname();
  const [direction, setDirection] = useState(1); // 1 = forward (left), -1 = back (right)
  const [prevPathname, setPrevPathname] = useState<string | null>(null);

  useEffect(() => {
    if (prevPathname) {
      // Define path order/depth
      const pathRank: Record<string, number> = {
        '/': 0,
        '/onboarding': 1,
        '/upload': 2,
        '/upload/preview': 3,
        '/result': 4,
        '/recommend': 5,
        '/service': 6,
        '/shop': 6,
        '/diy': 6,
        '/history': 1,
        '/profile': 1
      };

      const currentRank = pathRank[pathname] ?? (pathname.startsWith('/history/') ? 2 : 10);
      const prevRank = pathRank[prevPathname] ?? 0;

      if (currentRank < prevRank) {
        setDirection(-1);
      } else {
        setDirection(1);
      }
    }
    setPrevPathname(pathname);
  }, [pathname, prevPathname]);

  return direction;
}
