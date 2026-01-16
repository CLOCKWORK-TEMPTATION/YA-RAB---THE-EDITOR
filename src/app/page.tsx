// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home">
      <h1>Rabyana Screenplay Editor</h1>
      <p>محرر سيناريو عربي احترافي</p>

      <Link href="/editor">
        افتح المحرر
      </Link>
    </main>
  );
}