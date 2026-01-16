// src/app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "Rabyana Screenplay Editor",
  description: "Arabic Screenplay Editor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
      </body>
    </html>
  );
}