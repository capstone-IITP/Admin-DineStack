import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DineStack Admin",
  description: "Internal Control Console",
  icons: {
    icon: "/favicon.ico",
  },
};

import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        layout: {
          socialButtonsVariant: 'iconButton',
          logoImageUrl: '/icon.png'
        },
        variables: {
          colorPrimary: '#1F1F1F',
          colorText: '#1F1F1F',
          colorBackground: '#FFFFF0',
          colorInputBackground: '#FFFFFF',
          colorInputText: '#1F1F1F',
          borderRadius: '0px',
        },
        elements: {
          card: 'border-2 border-[#1F1F1F] shadow-[8px_8px_0px_0px_#8D0B41] rounded-none',
          formButtonPrimary: 'bg-[#1F1F1F] text-white hover:bg-[#333] shadow-[4px_4px_0px_0px_#8D0B41] active:translate-y-0.5 active:shadow-none transition-all rounded-none uppercase font-mono tracking-widest',
          formFieldInput: 'border-2 border-[#1F1F1F] rounded-none focus:border-[#8D0B41] focus:shadow-[2px_2px_0px_0px_#8D0B41] transition-all',
          footerActionLink: 'text-[#8D0B41] hover:text-[#1F1F1F] font-bold decoration-2 underline-offset-4',
          headerTitle: 'font-serif font-bold text-2xl',
          headerSubtitle: 'font-mono text-xs uppercase tracking-widest text-[#6A6A6A]',
        }
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ClientLayout>{children}</ClientLayout>
        </body>
      </html>
    </ClerkProvider>
  );
}

