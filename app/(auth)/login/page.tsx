import Link from "next/link";
import { Card } from "@/components/ui";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card
        className="w-full max-w-md"
        subtitle="Authentication flow will be implemented from PRD 01."
      >
        <h1 className="mb-2 text-xl font-semibold">Log in</h1>
        <Link href="/signup">Create account</Link>
      </Card>
    </main>
  );
}
