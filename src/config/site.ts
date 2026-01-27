export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "AI Haberleri",
  description:
    "Yapay zeka dünyasındaki gelişmeleri yakından takip edin. Güncel AI haberleri, makine öğrenimi, derin öğrenme ve teknoloji haberleri.",
  mainNav: [
    {
      title: "Ana Sayfa",
      href: "/",
    },
    {
      title: "Son Haberler",
      href: "/news",
    },
    {
      title: "Kategoriler",
      href: "/categories",
    },
    {
      title: "Hakkımızda",
      href: "/about",
    },
  ],
  links: {
    twitter: "https://twitter.com/aihaberleri",
    github: "https://github.com/aihaberleri",
    docs: "https://ui.shadcn.com",
  },
};
