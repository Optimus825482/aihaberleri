# AI News Site - Deployment Checklist

Use this checklist to ensure everything is properly configured and working.

## ✅ Pre-Deployment Checklist

### 1. Environment Setup

- [ ] Docker and Docker Compose installed
- [ ] Git installed
- [ ] Repository cloned
- [ ] `.env` file created from `.env.example`

### 2. API Keys Configuration

- [ ] **DeepSeek API Key** obtained and set in `.env`
  - Get from: https://platform.deepseek.com
  - Variable: `DEEPSEEK_API_KEY`
- [ ] **NextAuth Secret** generated and set
  - Generate with: `openssl rand -base64 32`
  - Variable: `NEXTAUTH_SECRET`
- [ ] **Unsplash API Key** obtained (optional but recommended)
  - Get from: https://unsplash.com/developers
  - Variable: `UNSPLASH_ACCESS_KEY`
- [ ] **Google AdSense** configured (optional)
  - Variable: `NEXT_PUBLIC_ADSENSE_CLIENT_ID`

### 3. Site Configuration

- [ ] Site name set in `.env`
  - Variable: `NEXT_PUBLIC_SITE_NAME`
- [ ] Site URL set in `.env`
  - Variable: `NEXT_PUBLIC_SITE_URL`
- [ ] Site description set in `.env`
  - Variable: `NEXT_PUBLIC_SITE_DESCRIPTION`

### 4. Agent Configuration

- [ ] Agent enabled
  - Variable: `AGENT_ENABLED=true`
- [ ] Articles per run configured
  - Variables: `AGENT_MIN_ARTICLES_PER_RUN`, `AGENT_MAX_ARTICLES_PER_RUN`
- [ ] Execution interval configured
  - Variable: `AGENT_MIN_INTERVAL_HOURS`

## ✅ Installation Checklist

### 1. Services Started

- [ ] Docker containers running

  ```bash
  docker-compose ps
  # All services should show "Up"
  ```

- [ ] PostgreSQL accessible

  ```bash
  docker-compose exec postgres psql -U aiuser -d ai_news_db
  ```

- [ ] Redis accessible
  ```bash
  docker-compose exec redis redis-cli ping
  # Should return: PONG
  ```

### 2. Database Setup

- [ ] Migrations executed

  ```bash
  docker-compose exec app npx prisma migrate deploy
  ```

- [ ] Categories seeded

  ```bash
  docker-compose exec app npx tsx scripts/seed-categories.ts
  ```

- [ ] Admin user created
  ```bash
  docker-compose exec app npx tsx scripts/create-admin.ts
  ```

### 3. Agent Setup

- [ ] First job scheduled

  ```bash
  # Via admin panel or CLI
  ```

- [ ] Worker running
  ```bash
  docker-compose logs worker
  # Should show: "News Agent Worker is running"
  ```

## ✅ Verification Checklist

### 1. Website Accessibility

- [ ] Homepage loads
  - URL: http://localhost:3000
  - Should show: Homepage with hero section

- [ ] Admin panel accessible
  - URL: http://localhost:3000/admin/login
  - Should show: Login form

- [ ] Admin login works
  - Use credentials from setup
  - Should redirect to dashboard

### 2. Admin Panel Features

- [ ] Dashboard displays stats
  - Total executions
  - Articles created
  - Success rate
  - Last execution

- [ ] "Run Agent Now" button works
  - Click button
  - Should execute agent
  - Check logs for progress

- [ ] "Schedule Job" button works
  - Click button
  - Should schedule next execution
  - Check upcoming jobs

- [ ] Execution history visible
  - Should show past executions
  - With status, articles created, duration

### 3. Agent Functionality

- [ ] Agent executes successfully

  ```bash
  docker-compose exec app npx tsx scripts/test-agent.ts
  ```

  - Should complete without errors
  - Should create 2-3 articles

- [ ] Articles appear on website
  - Check homepage
  - Should show newly created articles

- [ ] Article pages work
  - Click on article
  - Should show full article with image

- [ ] Categories work
  - Click on category
  - Should show articles in that category

### 4. SEO Features

- [ ] Sitemap accessible
  - URL: http://localhost:3000/sitemap.xml
  - Should show XML sitemap

- [ ] Robots.txt accessible
  - URL: http://localhost:3000/robots.txt
  - Should show robots directives

- [ ] Meta tags present
  - View page source
  - Should have title, description, OG tags

- [ ] Images optimized
  - Check Network tab
  - Should use WebP format

### 5. Performance

- [ ] Page loads fast (< 3s)
  - Use Chrome DevTools
  - Check Network tab

- [ ] Images lazy load
  - Scroll down page
  - Images should load on demand

- [ ] No console errors
  - Open browser console
  - Should be clean (no red errors)

## ✅ Production Checklist

### 1. Domain & SSL

- [ ] Domain purchased and configured
- [ ] DNS records set up
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] HTTPS working
- [ ] HTTP redirects to HTTPS

### 2. Security

- [ ] Firewall configured
  - Ports 80, 443 open
  - Port 22 restricted (SSH)

- [ ] Strong passwords set
  - Database password
  - Admin password
  - API keys secure

- [ ] Environment variables secure
  - `.env` file permissions: 600
  - Not committed to git

- [ ] Security headers enabled
  - Check with: https://securityheaders.com

### 3. Monitoring

- [ ] Uptime monitoring configured
  - UptimeRobot, Pingdom, or similar

- [ ] Error tracking set up
  - Sentry or similar

- [ ] Log aggregation configured
  - Papertrail, Logtail, or similar

- [ ] Health check endpoint working
  - URL: /api/health

### 4. Backups

- [ ] Database backup script created

  ```bash
  # See DEPLOYMENT.md for script
  ```

- [ ] Backup cron job scheduled
  - Daily at 2 AM

- [ ] Backup restoration tested
  - Restore from backup
  - Verify data integrity

### 5. Performance Optimization

- [ ] CDN configured (optional)
  - Cloudflare or CloudFront

- [ ] Caching enabled
  - Redis caching
  - Browser caching

- [ ] Images optimized
  - WebP format
  - Proper sizing

- [ ] Database indexed
  - Check query performance

### 6. SEO Optimization

- [ ] Sitemap submitted to Google
  - Google Search Console

- [ ] Google Analytics configured (optional)

- [ ] Social media meta tags verified
  - Twitter Card Validator
  - Facebook Debugger

- [ ] Structured data validated
  - Google Rich Results Test

## ✅ Ongoing Maintenance Checklist

### Daily

- [ ] Check agent execution logs

  ```bash
  docker-compose logs worker | tail -100
  ```

- [ ] Verify new articles published
  - Check homepage

- [ ] Monitor error logs
  - Check for any errors

### Weekly

- [ ] Review analytics
  - Page views
  - Popular articles
  - Traffic sources

- [ ] Check agent success rate
  - Admin dashboard

- [ ] Update content if needed
  - Edit articles
  - Add categories

### Monthly

- [ ] Update dependencies

  ```bash
  npm update
  docker-compose pull
  ```

- [ ] Security audit
  - Check for vulnerabilities
  - Update packages

- [ ] Performance audit
  - Run Lighthouse
  - Check Core Web Vitals

- [ ] Backup verification
  - Test restore process

### Quarterly

- [ ] Full system review
  - Architecture
  - Performance
  - Security

- [ ] SEO audit
  - Rankings
  - Backlinks
  - Content quality

- [ ] Feature planning
  - User feedback
  - New features
  - Improvements

## 🆘 Troubleshooting Checklist

### Agent Not Running

- [ ] Check worker logs

  ```bash
  docker-compose logs worker
  ```

- [ ] Verify API keys

  ```bash
  cat .env | grep DEEPSEEK_API_KEY
  ```

- [ ] Restart worker

  ```bash
  docker-compose restart worker
  ```

- [ ] Check queue
  ```bash
  docker-compose exec app npx tsx -e "
    import { getQueueStats } from './src/lib/queue';
    getQueueStats().then(console.log);
  "
  ```

### No Articles Appearing

- [ ] Check if agent executed

  ```bash
  docker-compose logs worker | grep "Agent execution"
  ```

- [ ] Check database

  ```bash
  docker-compose exec postgres psql -U aiuser -d ai_news_db -c "SELECT COUNT(*) FROM articles;"
  ```

- [ ] Run agent manually
  ```bash
  docker-compose exec app npx tsx scripts/test-agent.ts
  ```

### Website Not Loading

- [ ] Check app logs

  ```bash
  docker-compose logs app
  ```

- [ ] Verify port 3000 accessible

  ```bash
  curl http://localhost:3000
  ```

- [ ] Restart app
  ```bash
  docker-compose restart app
  ```

### Database Connection Error

- [ ] Check PostgreSQL running

  ```bash
  docker-compose ps postgres
  ```

- [ ] Verify DATABASE_URL

  ```bash
  cat .env | grep DATABASE_URL
  ```

- [ ] Restart database
  ```bash
  docker-compose restart postgres
  ```

## 📞 Support Resources

- **Documentation**: README.md, QUICKSTART.md, DEPLOYMENT.md
- **Logs**: `docker-compose logs [service]`
- **GitHub Issues**: [repository-url]/issues
- **Email**: support@example.com

---

## ✅ Final Verification

Before going live, ensure ALL items are checked:

- [ ] All environment variables configured
- [ ] All services running
- [ ] Database migrated and seeded
- [ ] Admin user created
- [ ] Agent scheduled and working
- [ ] Website accessible
- [ ] Admin panel working
- [ ] Articles publishing automatically
- [ ] SEO features working
- [ ] Performance optimized
- [ ] Security hardened
- [ ] Monitoring configured
- [ ] Backups scheduled

**Status**: Ready for Production ✅

---

**Last Updated**: 2024  
**Version**: 1.0.0
