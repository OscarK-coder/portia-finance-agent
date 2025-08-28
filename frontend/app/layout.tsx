"use client";

import "./globals.css";
import TopNavbar from "@/components/TopNavBar";
import { Toaster } from "sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* subtle bg (keeps it premium without distractions) */}
        <div
          aria-hidden
          className="fixed inset-0 -z-10 opacity-[0.05] [background:radial-gradient(900px_400px_at_50%_-10%,theme(colors.indigo.500/.25),transparent),linear-gradient(180deg,rgba(2,6,23,.2),transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 opacity-[0.06] [background:linear-gradient(to_right,theme(colors.zinc.700/.35)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.zinc.700/.35)_1px,transparent_1px)] [background-size:28px_28px]"
        />

        {/* <TopNavBar /> */}
        <main className="px-6 pb-10 pt-6 max-w-[1400px] mx-auto">{children}</main>
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}



// import { Toaster } from "react-hot-toast";

// export default function RootLayout({ children }) {
//   return (
//     <html lang="en">
//       <body>
//         {children}
//         <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
//       </body>
//     </html>
//   );
// }
