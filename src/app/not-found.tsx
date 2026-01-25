import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="text-center">
        <h1 className="mb-4 text-9xl font-bold text-blue-600">404</h1>
        <h2 className="mb-4 text-3xl font-semibold text-gray-800">
          Sayfa Bulunamadı
        </h2>
        <p className="mb-8 text-lg text-gray-600">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
