import { ToastProvider } from "@/app/components/Toast";

export const Document: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>JobMatch AI - Find Your Perfect Job</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body>
      <div id="root">{children}</div>
      <ToastProvider />
    </body>
  </html>
);
