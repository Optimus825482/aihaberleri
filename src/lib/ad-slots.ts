/**
 * AdSense Reklam Slot ID Merkezi Yönetimi
 * ============================================
 * Tüm reklam birimlerini tek yerden yönet.
 * AdSense panelinden yeni slot açtığında buraya ekle.
 *
 * Slot Listesi (AdSense panelinden):
 * - banner-top:          1563878275  Görüntülü
 * - multiplex-related:   3028498607  Multiplex
 * - article-bottom:      2050458858  Görüntülü
 * - infeed-homepage-en:  8493771212  Feed içi
 * - infeed-newslist:     1906988626  Feed içi
 * - infeed-homepage-tr:  2042719998  Feed içi
 * - sidebar-display:     3415511418  Görüntülü
 * - EN haber detay:      3183333271  Multiplex
 * - TR haber detay:      6220560152  Yazı içi
 * - Ana sayfa EN:        5382266994  Görüntülü
 * - Ana sayfa TR:        3977540197  Görüntülü
 * - fedd:                6653849624  Feed içi
 */

export const AD_SLOTS = {
  // Dedicated mobile sticky slot (override via env when separate AdSense unit is ready)
  _STICKY_BOTTOM_MOBILE_SLOT:
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_STICKY_BOTTOM_MOBILE || "1563878275",

  // ─── Ana Sayfa ───────────────────────
  /** TR ana sayfa — trending altı banner */
  HOME_BANNER_TR: "3977540197",
  /** EN ana sayfa — trending altı banner */
  HOME_BANNER_EN: "5382266994",
  /** TR ana sayfa — haber listesi arası feed */
  HOME_INFEED_TR: "2042719998",
  /** EN ana sayfa — haber listesi arası feed */
  HOME_INFEED_EN: "8493771212",

  // ─── Haber Detay ─────────────────────
  /** TR makale içi (paragraf arası) — yazı içi format */
  ARTICLE_INLINE_TR: "6220560152",
  /** EN makale içi (paragraf arası) — yazı içi format (TR ile ortak slot) */
  ARTICLE_INLINE_EN: "6220560152",
  /** Makale altı banner — TR & EN ortak */
  ARTICLE_BOTTOM: "2050458858",
  /** Sidebar reklam — desktop, dikey format */
  SIDEBAR_DISPLAY: "3415511418",
  /** Multiplex — "Bunları da Okuyun" tarzı öneriler */
  MULTIPLEX_RELATED: "3028498607",

  // ─── Haber Listesi & Kategori ────────
  /** Sayfa başı banner — listeler ve kategoriler */
  BANNER_TOP: "1563878275",
  /** Haber listesi feed arası */
  INFEED_NEWSLIST: "1906988626",
  /** Genel feed reklam (ek yerleşimler) */
  INFEED_GENERAL: "6653849624",

  // ─── Site Geneli ─────────────────────
  /** Mobil yapışkan alt reklam — Görüntülü (display) tip olmalı, feed slot sticky'de 400 verir */
  STICKY_BOTTOM_MOBILE:
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_STICKY_BOTTOM_MOBILE || "1563878275",
} as const;

export type AdSlotKey = keyof typeof AD_SLOTS;
