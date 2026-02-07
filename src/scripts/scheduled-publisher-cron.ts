#!/usr/bin/env node

/**
 * Scheduled Publisher Cron Job
 * 
 * Bu script scheduled-publisher.ts servisini kullanarak
 * zamanlanmış makaleleri otomatik olarak yayınlar.
 * 
 * Kullanım:
 * - Manuel: node src/scripts/scheduled-publisher-cron.ts
 * - Cron: Her 5 dakika (crontab: 0,5,10,... * * * *)
 */

import { checkScheduledArticles } from '../lib/scheduled-publisher';

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Scheduled Publisher başlatılıyor...`);

  try {
    const result = await checkScheduledArticles();
    
    const duration = Date.now() - startTime;
    
    console.log(`[${new Date().toISOString()}] Tamamlandı (${duration}ms)`);
    console.log(`  ✅ Yayınlanan: ${result.published}`);
    console.log(`  ❌ Başarısız: ${result.failed}`);
    
    // Exit with error code if any failures
    process.exit(result.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Fatal error:`, error);
    process.exit(1);
  }
}

main();
