import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Lecture Tutor",
  description: "A supportive AI tutor that helps you learn from your own lecture material.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
