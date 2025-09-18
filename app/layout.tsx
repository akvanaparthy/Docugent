import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../lib/cleanup"; // Import cleanup handlers
import { ErrorBoundary } from "./components/ErrorBoundary";

// Global error handler to prevent server crashes
if (typeof window === "undefined") {
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    // Don't exit the process, just log the error
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    // Don't exit the process, just log the error
  });
}

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Docugent - AI Document Assistant",
  description:
    "Upload documents or provide URLs and ask questions about their content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
