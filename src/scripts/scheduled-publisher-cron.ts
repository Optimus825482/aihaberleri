#!/usr/bin/env node

/**
 * Scheduled Publisher Cron Job
 * 
 * Bu script scheduled-publisher.ts servisini kullanarak
 * zamanlanmış makaleleri otomatik olarak yayınlar.
 * 
 * Kullanım:
 * - Manuel: node src/scripts/scheduled-publisher-cron.ts
 * - Cron: */5 * * * * node src/scripts/scheduled-publisher-cron.ts
 */

import { checkScheduledArticles } from '../lib/scheduled-publisher';

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Scheduled Publisher başlatılıyor...`);

  try {
    const result = await checkScheduledArticles();
    
    const duration = Date.now() - startTime;
    
    console.log(`[${new Date().toISOString()}] Tamamlandı (${duration}ms)`);
    console.log(`  ✅ Yayınlanan: ${result.published.length}`);
    console.log(`  ❌ Başarısız: ${result.failed.length}`);
    
    if (result.published.length > 0) {
      console.log('\n  Yayınlanan makaleler:');
      result.published.forEach((article) => {
        console.log(`    - ${article.title} (${article.id})`);
      });
    }
    
    if (result.failed.length > 0) {
      console.error('\n  Başarısız makaleler:');
      result.failed.forEach((failure) => {
        console.error(`    - ${failure.article.title}: ${failure.error}`);
      });
    }
    
    // Exit with error code if any failures
    process.exit(result.failed.length > 0 ? 1 : 0);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Fatal error:`, error);
    process.exit(1);
  }
}

main();
