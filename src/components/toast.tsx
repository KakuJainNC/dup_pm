"use client";

export function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#355e3b] px-6 py-3 text-sm font-medium text-white shadow-lg">
      {message}
    </div>
  );
}
