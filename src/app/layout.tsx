import type { Metadata } from "next";
import { Exo_2 } from "next/font/google";

import { Providers, themeNoFlashScript } from "./providers";
import "./globals.css";

// Bản gốc ép font 'Exo 2' cho toàn bộ component antd qua custom-antd.less
const exo2 = Exo_2({
  variable: "--font-exo2",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "D-Tech Admin",
  description: "Trang quản trị cửa hàng thiết bị điện tử & máy tính",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      data-theme="light"
      className={`${exo2.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeNoFlashScript }} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
