export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <title>Teklif Yazdır</title>
      </head>
      <body className="bg-white text-black min-h-screen">
        {children}
      </body>
    </html>
  );
}
