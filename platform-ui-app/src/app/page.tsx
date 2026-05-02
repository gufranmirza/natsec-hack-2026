import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function HomePage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-foreground text-lg font-semibold">
          Mission Commander
        </h1>
        <p className="text-foreground/60 mt-1 text-sm">Coming soon</p>
      </div>
    </div>
  );
}
