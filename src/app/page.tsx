import type { Metadata } from "next";
import { Suspense } from "react";
import Calculator from "@/components/Calculator";
import { decodeState, encodeState, money, total } from "@/lib/pricing";

export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  const { stack, users, assumptions } = decodeState(await searchParams);
  const cost = money(total(stack, users, assumptions));
  const title = `This stack costs ${cost}/mo at ${users.toLocaleString("en-US")} users — StackBill`;
  const image = `/api/og?${encodeState(stack, users, assumptions)}`;
  return {
    title,
    description: "See what your Vercel, Supabase, Clerk, AI and email bill looks like at 1K, 10K and 100K users.",
    openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}

async function CalculatorFromUrl({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { stack, users, assumptions } = decodeState(await searchParams);
  return <Calculator initialStack={stack} initialUsers={users} initialAssumptions={assumptions} />;
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-10 max-w-2xl">
        <p className="mb-2 font-mono text-sm text-muted">stackbill</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">What will your stack cost when you grow?</h1>
        <p className="mt-3 text-lg text-muted">
          Pick your services, slide to your user count, and see the monthly bill at 1K, 10K, 100K and 1M users —
          before it surprises you.
        </p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-card" />}>
        <CalculatorFromUrl searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
