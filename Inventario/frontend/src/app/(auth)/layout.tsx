import { PackageIcon } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold">
          <PackageIcon aria-hidden className="size-6" /> Inventario
        </div>
        {children}
      </div>
    </main>
  );
}
