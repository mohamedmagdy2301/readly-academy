# Flutter Clean Path

رحلة Clean Architecture في Flutter.

كورس تعليمي بترتيب المذاكرة: 10 وحدات، وكل وحدة فيها دروس، وكل درس فيه الشرح بالمستويات والكود والمعمل التفاعلي وأسئلة «اختبر نفسك» في مكان واحد. وآخر درس في كل وحدة هو «التطبيق والمهام»: مهام بتطبّقها في مشروع Readly، وسؤال مراجعة بتكتب إجابته.

المحتوى كله ملفات MDX، والأجزاء التفاعلية React components، والـ build بيطلّع موقع static ترفعه على أي استضافة.

## التشغيل

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # بيطلّع الموقع static في out/
npm run preview    # يعرض out/ محليًا
npm run typecheck
```

محتاج Node 20 أو أحدث. على Windows، خلي المشروع في مسار كله إنجليزي ومن غير مسافات (مثلًا `W:\dev\readly-academy`).

## الصفحات

| الصفحة | الـ URL | فيها |
| --- | --- | --- |
| الرئيسية | `/` | «كمّل الدرس الجاي»، وتقدّم كل وحدة |
| الكورس | `/course/` | كل الوحدات والدروس |
| الوحدة | `/course/<unit>/` | مقدمة الوحدة ودروسها |
| الدرس | `/course/<unit>/<lesson>/` | الدرس نفسه، و«خلصت الدرس، اللي بعده» |
| المراجعة | `/review/` | تابات: كروت المراجعة، أسئلة الـ interviews، الملخص، المسرد، إجاباتي |
| المصادر | `/resources/` | تابات: الـ docs والـ packages، الكورسات والفيديوهات |

## هيكل المشروع

```text
content/
├─ units/
│  ├─ 00-start/
│  │  ├─ _unit.mdx            # عنوان الوحدة ووصفها ومقدمتها
│  │  ├─ 01-how-to-use.mdx    # درس (الرقم = الترتيب، وبيتشال من الـ URL)
│  │  ├─ ...
│  │  └─ 99-practice.mdx      # «التطبيق والمهام»: دايمًا آخر درس
│  ├─ 01-foundations/
│  └─ ...
├─ review/        # interview.mdx, cheat-sheet.mdx, glossary.mdx (كل ملف = تاب)
├─ resources/     # sources.mdx, courses.mdx (كل ملف = تاب)
├─ diagrams/      # الرسومات SVG
└─ _templates/    # قوالب الدرس والوحدة والتطبيق (بيستخدمها npm run new)
scripts/
├─ build-index.mjs   # بيولّد البحث والكروت، وبيتأكد إن الـ ids مش متكررة
└─ new.mjs           # بيعمل وحدة أو درس جديد من القوالب
src/
├─ app/              # الصفحات: page.tsx، course/، review/، resources/
├─ components/
│  ├─ mdx.tsx        # كل الـ components المتاحة جوه MDX
│  ├─ labs/          # المعامل التفاعلية + index.tsx (السجل بتاعها)
│  └─ CourseSidebar، LessonFooter، Home، Tabs، Flashcards، Search ...
└─ lib/
   ├─ course.ts      # قراية الوحدات والدروس
   ├─ pages.ts       # صفحات المراجعة والمصادر
   ├─ keys.ts        # مفاتيح localStorage
   └─ storage.ts     # hook مشترك فوق localStorage
```

## إضافة محتوى

### درس جديد

```bash
npm run new -- lesson presentation forms "الـ Forms والـ validation"
```

ده بيعمل `content/units/05-presentation/04-forms.mdx` من القالب، برقم بعد آخر درس وقبل `99-practice`. الدرس بيبدأ `draft: true`: بيظهر في `npm run dev` ومكتوب جنبه «مسودة»، وما بيظهرش في الـ build. لما يخلص، امسح سطر `draft`.

### وحدة جديدة

```bash
npm run new -- unit performance "الأداء والـ profiling"
```

بيعمل فولدر برقم بعد آخر وحدة، فيه `_unit.mdx` و`99-practice.mdx`. ضيف الدروس جواه بـ `npm run new -- lesson`.

### الـ frontmatter بتاع الدرس

```yaml
---
title: "عنوان الدرس"
description: "سطر بيظهر تحت العنوان وفي قائمة الدروس"
minutes: 15          # اختياري
type: "practice"     # بس لدرس التطبيق
draft: true          # اختياري: يخفيه من الـ build
---
```

لو عايز تغيّر ترتيب الدروس، غيّر الرقم في أول اسم الملف.

### الـ components المتاحة جوه MDX

| الـ component | الاستخدام |
| --- | --- |
| `<Level n="1" title="...">` | مستوى شرح: 1 مبتدئ و2 متوسط (مفتوحين)، 3 متقدم و4 احترافي (مقفولين) |
| `<LessonPart title="...">` | جزء بعنوان جوه الدرس، زي «قبل وبعد والكود» |
| `<Lab name="debounce" />` | معمل تفاعلي (الأسماء في `src/components/labs/index.tsx`) |
| `<Analogy title="...">` | تشبيه |
| `<Note kind="info\|warn\|interview" title="...">` | ملاحظة أو سؤال interview |
| `<CodeBlock label="...">` | عنوان فوق code block |
| `<Diagram name="d-xxx">caption</Diagram>` | رسم من `content/diagrams/d-xxx.svg` |
| `<Quiz>` + `<Question id><Ask>..</Ask><Answer>..</Answer></Question>` | أسئلة «اختبر نفسك»، وبتدخل في كروت المراجعة لوحدها |
| `<Tasks>` + `<Task id="...">` | مهام بتتعلّم عليها |
| `<Deliverable>` و`<ReviewQuestion>` و`<LogBox id="..." />` | آخر الوحدة: المطلوب، وسؤال المراجعة، وخانة الإجابة |
| `<BeforeAfter>` + `<Side label kind="before\|after">` | كود قبل وبعد |
| `<Scenario>`، `<Journey>` + `<Step file>` | رحلة خطوة بخطوة |
| `<CheatGrid>` + `<CheatCard>` | كروت ملخص |
| `<Courses>`، `<CourseTopic>`، `<CourseCol>`، `<Res>` | جدول الكورسات |

قواعد مهمة:
- الـ `id` بتاع أي `Task` أو `Question` أو `LogBox` لازم يكون مميز في الموقع كله، وثابت بعد النشر، لأنه مفتاح التقدم المحفوظ. الـ build بيقف ويقولك لو في id متكرر.
- الـ props كلها strings (`n="1"` مش `n={1}`)، لأن JavaScript expressions مقفولة في MDX.
- الأقواس `{` و`}` في النص العادي بتتكتب `\{` و`\}`. جوه الـ code مش محتاجة.

### رسم جديد

اعمل ملف SVG في `content/diagrams/` واستخدم ألوان الموقع: `var(--ink)`، `var(--accent)`، `var(--warn)`، `var(--muted)`، `var(--surface)`، `var(--line)`، فيتغير لوحده مع الوضع الليلي. الأسهم الجاهزة: `marker-end="url(#mk-ink)"` (وكمان `mk-acc` و`mk-warn` و`mk-mut` و`mk-good`). للنص العربي جوه الرسم: `class="ar" direction="rtl"`.

### معمل جديد

1. اعمل component في `src/components/labs/` يبدأ بـ `"use client"`.
2. سجّله في `src/components/labs/index.tsx`.
3. استخدمه في أي درس: `<Lab name="اسمه" />`.

## النشر

الناتج في `out/` موقع static.

- **DigitalOcean App Platform:** اعمل Static Site من الـ repo. Build command: `npm run build`، وOutput directory: `out`.
- **Vercel أو Netlify أو Cloudflare Pages:** بيشغّلوه من غير إعداد.
- **سيرفر عادي (Nginx):** ارفع محتوى `out/`. كل صفحة عبارة عن `index.html` جوه فولدر.

لو هترفعه في فولدر فرعي، ضيف `basePath` في `next.config.ts`، وعدّل الـ `fetch("/...json")` في `Search.tsx` و`Flashcards.tsx`.

## أفكار للتطوير

- syntax highlighting للكود بـ `rehype-pretty-code`.
- مزامنة التقدم بين الأجهزة (Supabase أو Firebase).
- وضع امتحان بوقت لأسئلة الـ interviews.
- ترجمة إنجليزي.
