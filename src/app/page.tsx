'use client';

import KakaoMap from "@/components/Map";
export default function Home() {
  return (
    <main className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex flex-1 w-full h-full flex-col items-center justify-between bg-white dark:bg-black">
        <KakaoMap/>
      </div>
    </main>
  );
}
