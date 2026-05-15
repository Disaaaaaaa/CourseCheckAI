# CourseWorkCheck

12-сынып Қазақстан тарихы пәнінен курстық жұмыстарды AI көмегімен тексеретін веб-платформа. Мұғалім PDF-ті жүктейді, OpenAI Responses API 40-баллдық рубрика бойынша балл жобасы мен дәлелді кері байланыс ұсынады, мұғалім соңғы баллды өзі бекітеді.

## Стек

- **Next.js 16** (App Router, Turbopack), TypeScript, Tailwind v4
- **Supabase**: Auth (email/password), PostgreSQL + RLS, Storage
- **OpenAI Responses API** + Structured Outputs (Zod schema)
- shadcn-style UI компоненттері (қолмен), TanStack Query, react-hook-form, Sonner toast
- ExcelJS — Excel есеп шығаруға

## 1. Supabase жобасын дайындау

1. [supabase.com](https://supabase.com/dashboard) ішінде жаңа жоба ашыңыз.
2. **Project Settings → API** бөлімінен үш кілтті көшіріңіз:
   - `Project URL`
   - `anon public` key
   - `service_role` key (құпия, тек серверде)
3. **SQL Editor** ашып, келесі үш миграцияны ретімен орындаңыз:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_rls_policies.sql`
   - `supabase/migrations/0003_storage.sql`
4. **Authentication → Providers → Email** қосылғанына көз жеткізіңіз. MVP кезінде "Confirm email" өшіріп қойсаңыз — тіркелу бойынша бірден кіреді.

> Supabase CLI бар болса: `supabase db push` арқылы үш SQL файлын автоматты жүгіртуге болады.

## 2. Environment

`.env.example` файлын `.env.local`-ке көшіріп, мәндерді толтырыңыз.

```bash
cp .env.example .env.local
```

| Айнымалы | Сипаттама |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (PDF upload + талдау серверде) |
| `OPENAI_API_KEY` | OpenAI API кілті |
| `OPENAI_MODEL` | Үнсіз `gpt-5`. PDF-ті оқи алатын модель таңдаңыз |
| `SIGNED_URL_TTL_SECONDS` | PDF signed URL мерзімі (900 = 15 мин) |

## 3. Жергілікті іске қосу

```bash
npm install
npm run dev
```

Браузер: <http://localhost:3000>. Жоқ профиль `auth.users` ішіне қосылғанда `public.teachers`-ке трей-трейтриггер арқылы жазылады.

## 4. Маршруттар

| Жол | Сипаттама |
| --- | --- |
| `/login` | Email/password арқылы кіру және тіркелу |
| `/dashboard` | KPI карточкалар, соңғы жұмыстар |
| `/submissions` | Тізім + сүзгілер (статус, сынып, іздеу) |
| `/submissions/new` | PDF жүктеу + AI талдау бастау |
| `/submissions/[id]` | Толық AI талдау, балл, кері байланыс |
| `/submissions/[id]/review` | PDF алдын ала қарау + критерий бойынша балл бекіту |
| `/submissions/[id]/report` | Басып шығаруға дайын есеп, Excel экспорт |
| `/settings` | Мұғалім профилі |

## 5. API endpoints

| Әдіс | Маршрут | Не істейді |
| --- | --- | --- |
| `POST` | `/api/submissions` | PDF + meta жүктеу, submission жасау |
| `POST` | `/api/submissions/[id]/analyze` | OpenAI Responses API арқылы талдау |
| `GET` | `/api/submissions/[id]/pdf-url` | Уақытша signed URL |
| `POST` | `/api/submissions/[id]/export?type=excel` | Excel есеп |
| `PATCH` | `/api/submissions/[id]/finalize` | Соңғы балл + аннотация бекіту |
| `PATCH` | `/api/criterion-results/[id]` | Жеке критерий баллын өзгерту |
| `PATCH` | `/api/me` | Профиль жаңарту |

## 6. AI ағыны

1. Клиент PDF + меатадатаны `/api/submissions`-қа жібереді.
2. Сервер PDF-ті `coursework-pdfs/<teacher_id>/<submission_id>/original.pdf` жолы бойынша Storage-ке салады.
3. Клиент `/api/submissions/[id]/analyze` шақырады.
4. Сервер PDF-ті OpenAI Files API-ке жүктеп, `responses.parse` арқылы `text.format` ретінде Zod-тен жасалған JSON Schema-ны береді.
5. AI әр критерийге `suggested_score`, `evidence_from_text`, `problem`, `recommendation`, `confidence` қайтарады.
6. Сервер нәтижені `ai_reviews` + `criterion_results` + `interview_questions` кестелеріне жазады, `submissions.status = ready`.

> AI ешқашан соңғы баллды қоймайды. Мұғалім `/review` бетінде әр баллды өзгертіп, `Бекіту` басады — сонда `teacher_final_reviews.is_finalized=true` болады, статус `reviewed`.

## 7. Рубрика

40 балл, 30 критерий, 3 БМ. Толық тізім — [`src/lib/rubric.ts`](src/lib/rubric.ts) ішінде. AI міндетті түрде сол кодтармен жауап беруі тиіс — `src/lib/ai/prompt.ts` промптта осы орындалуы талап етіледі.

## 8. Қауіпсіздік

- Service role key тек серверде (`src/lib/supabase/admin.ts`).
- RLS барлық `public.*` кестелерде қосылған, мұғалім тек өзінің `teacher_id`-іне сай жолдарды көреді.
- Storage policy `coursework-pdfs/<teacher_id>/...` префиксіне ғана рұқсат береді.
- PDF алдын ала қарау — signed URL (`SIGNED_URL_TTL_SECONDS`).

## 9. Скрипттер

```bash
npm run dev      # development server
npm run build    # production build (Turbopack)
npm run start    # production server
npm run lint     # ESLint
```

## 10. Болашақта

- Generated Supabase types: `npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.ts`
- OCR (Tesseract / Google Vision) сканер PDF-тер үшін
- Turnitin/LRF/IMMS интеграциялары
- Мектеп әкімшісі панелі, бір жұмысты екі мұғалім модерациясы
