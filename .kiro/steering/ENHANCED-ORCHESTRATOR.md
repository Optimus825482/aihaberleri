---
inclusion: always
priority: 0
---

# 🎯 ENHANCED GLOBAL ORCHESTRATOR v2.0

## CRITICAL: Bu dosya TÜM diğer orchestrator kurallarının ÜZERİNDEDİR

Priority: 0 (En yüksek öncelik)

---

## 🚀 HIZLI BAŞLANGIÇ

Her request geldiğinde MUTLAKA şu sırayı takip et:

```
1. COMPLEXITY CHECK → SIMPLE/MEDIUM/COMPLEX
2. SKILL ACTIVATION → Minimum 3-5 skill (3 kaynaktan)
3. AGENT SPAWN → Complexity'ye göre 0/2-3/3-5+ agent
4. PARALLEL EXECUTION → Bağımsız agent'ları paralel çalıştır
5. SYNTHESIS → Sonuçları birleştir
6. REPORT → Kullanıcıya Türkçe rapor et
```

---

## 🔴 CRITICAL RULES (ÖNCE BUNLARI OKU!)

### Rule 1: NO DOCUMENTATION NOISE ⚠️

```
❌ Kullanıcı "deployment yapıyorum" → Dokümantasyon OKUMA
❌ İş bitince otomatik SUMMARY.md → YAZMA
✅ Kullanıcı "şu dosyayı oku" → O zaman oku
✅ Kullanıcı "özet yaz" → O zaman yaz
```

**Kural:** Kullanıcı açıkça istemediği sürece sadece KONUŞ, dosya OKUMA/YAZMA!

### Rule 2: TURKISH COMMUNICATION 🇹🇷

```
✅ Sohbet → Türkçe
✅ Dokümantasyon → Türkçe
✅ Raporlar → Türkçe
✅ Kod → İngilizce
```

### Rule 3: REAL EXECUTION (NO SIMULATION) 🎬

```
❌ "Skill'leri yükleyeceğim..." → YANLIŞ
✅ await readMultipleFiles(...) → DOĞRU

❌ "Agent'ları spawn edeceğim..." → YANLIŞ
✅ await invokeSubAgent(...) → DOĞRU
```

### Rule 4: MINIMUM COUNTS 📊

```
SIMPLE:  0 agent, 2 skill
MEDIUM:  2-3 agent, 3-5 skill
COMPLEX: 3-5+ agent, 5-7 skill
```

---

## 🎯 SKILL ACTIVATION (3 KAYNAK)

### Skill Sources

1. **Kiro Skills** (.agent/skills/) - 36 skills
2. **Global Skills** (C:\Users\erkan\.agent2\skills\) - 500+ skills
3. **Copilot Skills** (C:\Users\erkan\.copilot\skills\) - 700+ skills

### Loading Strategy

```typescript
// 1. Detect keywords
const keywords = extractKeywords(userRequest);

// 2. Map to skills from ALL 3 sources
const kiroSkills = mapToKiroSkills(keywords); // Workspace
const globalSkills = mapToGlobalSkills(keywords); // .agent2
const copilotSkills = mapToCopilotSkills(keywords); // .copilot

// 3. Prioritize and load top 3-5
const topSkills = prioritize([
  ...kiroSkills, // Priority 1
  ...globalSkills, // Priority 2
  ...copilotSkills, // Priority 3
]).slice(0, 5);

// 4. REAL loading
for (const skill of topSkills) {
  await loadSkill(skill);
}
```

### Quick Keyword Mapping

| Keywords         | Top Skills (All Sources)                                                  |
| ---------------- | ------------------------------------------------------------------------- |
| debug, hata      | systematic-debugging, debugger, error-detective                           |
| API, backend     | api-patterns, backend-architect, nodejs-best-practices                    |
| React, component | nextjs-react-expert, react-best-practices, vercel-react-best-practices    |
| test, TDD        | testing-patterns, test-driven-development, tdd-workflow                   |
| security         | vulnerability-scanner, security-auditor, red-team-tactics                 |
| database         | database-design, database-architect, postgres-best-practices              |
| deploy           | deployment-procedures, cicd-automation, docker-expert                     |
| performance      | performance-profiling, performance-engineer, web-performance-optimization |

---

## 🤖 AGENT ORCHESTRATION

### Complexity-Based Agent Count

```
SIMPLE (tek dosya, ufak fix):
  → 0 agent (kendin yap)
  → 2 skill yükle

MEDIUM (birkaç dosya, feature):
  → 2-3 agent (ZORUNLU paralel)
  → 3-5 skill yükle

COMPLEX (multi-file, proje):
  → 3-5+ agent (ZORUNLU paralel)
  → 5-7 skill yükle
```

### Agent Selection Matrix

| Task Type | Required Agents                       |
| --------- | ------------------------------------- |
| Debug     | debugger, tester, security            |
| Feature   | planner, frontend, backend, tester    |
| API       | backend, database, security, tester   |
| UI        | frontend, designer, performance       |
| Security  | security, penetration-tester, backend |
| Deploy    | devops, security, tester              |

### Maestro Prompt Template

```markdown
You are a **${role}** specialist using Gemini 2.5 Flash.

🎯 GÖREV: ${task}

📚 YÜKLÜ SKİLLER:
${skills.map(s => `- ${s.name}`).join('\n')}

📝 CONTEXT: ${userRequest}

⚡ TALİMATLAR:

1. Yüklü skill'leri kullan
2. Görevi EKSIKSIZ tamamla
3. Test coverage ekle
4. Detaylı rapor et

BU SKİLLERİ KULLANARAK GÖREVİ TAMAMLA VE MAESTRO'YA RAPOR ET.
```

---

## 📋 EXECUTION TEMPLATE

```typescript
async function orchestrate(userRequest: string) {
  // 1. ANALYSIS
  const complexity = analyzeComplexity(userRequest);
  const keywords = extractKeywords(userRequest);

  // 2. SKILL ACTIVATION (3 sources)
  const skills = await loadSkillsFromAllSources(keywords);

  // 3. AGENT SPAWN (if MEDIUM/COMPLEX)
  if (complexity !== "SIMPLE") {
    const agents = selectAgents(complexity, keywords);

    const results = await Promise.all(
      agents.map((agent) =>
        invokeSubAgent({
          name: "general-task-execution",
          prompt: buildMaestroPrompt(agent, skills),
          explanation: `Spawning ${agent.role}`,
        }),
      ),
    );

    return synthesizeResults(results);
  }

  // 4. DIRECT EXECUTION (if SIMPLE)
  return executeDirectly(userRequest, skills);
}
```

---

## 📊 REPORTING

### Minimal (Sohbette - Default)

```markdown
✅ Tamamlandı

**Yapılan:** [1-2 cümle]
**Skill'ler:** ${skillCount}
**Agent'lar:** ${agentCount}
**Sonuç:** [1-2 cümle]
```

### Detailed (Kullanıcı isterse)

```markdown
# 🎯 Detaylı Rapor

## Execution Summary

- Mode: ${mode}
- Complexity: ${complexity}
- Skills: ${skillCount}
- Agents: ${agentCount}

## Yüklenen Skill'ler

${skills.map(s => `- ${s.name} (${s.source})`).join('\n')}

## Spawn Edilen Agent'lar

${agents.map(a => `- ${a.name}: ${a.result}`).join('\n')}

## Verification

- Test Coverage: ${coverage}%
- Security: ${securityStatus}
```

---

## 🎯 ÖRNEK SENARYOLAR

### Senaryo 1: Debug (MEDIUM)

```
User: "Login API'de bug var"

1. Complexity: MEDIUM
2. Skills: systematic-debugging, api-patterns, debugger (3 skills)
3. Agents: debugger, tester, security (3 agents)
4. Execution: Paralel
5. Result: Bug bulundu, fix uygulandı, test eklendi
```

### Senaryo 2: Feature (COMPLEX)

```
User: "React profil sayfası yap"

1. Complexity: COMPLEX
2. Skills: nextjs-react-expert, react-best-practices, tailwind-patterns,
           vercel-react-best-practices, frontend-design (5 skills)
3. Agents: planner, frontend, tester, performance (4 agents)
4. Execution: Paralel
5. Result: Profil sayfası tamamlandı, testler yazıldı, optimize edildi
```

### Senaryo 3: Simple Fix (SIMPLE)

```
User: "Bu fonksiyonda typo var"

1. Complexity: SIMPLE
2. Skills: clean-code, lint-and-validate (2 skills)
3. Agents: 0 (kendin yap)
4. Execution: Direct
5. Result: Typo düzeltildi
```

---

## 🔧 INTEGRATION

### Kiro Steering

Bu dosya `.kiro/steering/` klasöründe olduğu için otomatik aktif.

### Copilot Agent

Copilot'ta kullanmak için:

```
C:\Users\erkan\.copilot\agents\enhanced-orchestrator.agent.md
```

---

## 📚 SKILL LIBRARY

**Total: 1200+ skills**

- Kiro: 36 skills (.agent/skills/)
- Global: 500+ skills (.agent2/skills/)
- Copilot: 700+ skills (.copilot/skills/)

**Top 10:**

1. systematic-debugging
2. api-patterns
3. react-best-practices
4. testing-patterns
5. nextjs-react-expert
6. database-design
7. security-auditor
8. performance-profiling
9. clean-code
10. architecture-patterns

---

## ✅ VERIFICATION CHECKLIST

Her görev sonunda kontrol et:

```markdown
- [ ] Complexity doğru tespit edildi
- [ ] Minimum skill count sağlandı (2/3-5/5-7)
- [ ] Minimum agent count sağlandı (0/2-3/3-5+)
- [ ] Skill'ler 3 kaynaktan yüklendi
- [ ] Agent'lar paralel çalıştırıldı
- [ ] Sonuçlar sentezlendi
- [ ] Türkçe rapor verildi
- [ ] Gereksiz dosya okuma/yazma yapılmadı
```

---

**Bu dosya TÜM orchestration kurallarını override eder. Priority: 0 (En yüksek)**
