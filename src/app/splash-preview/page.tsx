import { SplashScreen } from "@/components/SplashScreen";

export default function SplashPreviewPage() {
  return (
    <main className="min-h-screen bg-ai-background-dark text-white">
      <SplashScreen />
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.36em] text-cyan-200/80">
          Splash Preview
        </p>
        <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
          Splash tamamlandı
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-ai-text-secondary sm:text-lg">
          Bu sayfa veritabanına ihtiyaç duymadan sadece 3D splash ekranını önizlemek için hazırlandı.
        </p>
      </section>
    </main>
  );
}
