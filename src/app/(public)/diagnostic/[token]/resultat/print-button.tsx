"use client";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M7 8V4h10v4M7 16h10v4H7v-4Zm-2 0H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Version imprimable
    </Button>
  );
}
