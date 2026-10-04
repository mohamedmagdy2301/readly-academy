# قواعد سيشنز المحتوى

الملف ده بتقراه كل سيشن بتضيف محتوى للكورس. في سيشنز تانية شغالة **بالتوازي** على نفس الفولدر، فالتزم بيه بالحرف.

## 1. قبل ما تكتب

- اقرا `README.md`، وبالذات جزء «إضافة محتوى» وجدول الـ components، واقرا `CLAUDE.md`.
- اقرا `content/units/05-presentation/01-cubit.mdx` كله. ده المرجع للأسلوب والتنسيق والطول.
- اقرا الدروس المذكورة في الـ prompt بتاعك، عشان تبني عليها ماتكررهاش، وعشان تستخدم نفس الأسماء.
- لو هتعمل رسم، اقرا رسم موجود الأول (مثلًا `content/diagrams/d-82c6ceff39.svg`).

## 2. قواعد التوازي (مهمة جدًا)

- **عدّل الملفات المذكورة في الـ prompt بتاعك بس.** والرسومات الجديدة باسم `content/diagrams/d-<البادئة بتاعتك>-*.svg` بس.
- ماتلمسش: ملفات `99-practice.mdx`، و`_unit.mdx`، و`content/review/`، و`content/resources/`، و`content/_templates/`، و`src/`، و`scripts/`، و`package.json`. أي تعديل محتاجه بره ملفاتك، اكتبه في الملخص الأخير، وسيشن التجميع هتعمله.
- **ماتشغّلش** `npm run build` ولا `npm run dev` ولا `npm run index`. كلهم بيكتبوا في `.next/` و`public/` المشتركين، وهيبوظوا شغل السيشنز التانية. الفحص بتاعك هو `scripts/check-content.mjs` (تحت).
- **ماتشغّلش** `npm run new`. الملفات اتعملت خلاص بأرقام ثابتة.
- **ماتشغّلش أي git command بيغيّر حاجة**: commit، checkout، stash، reset، restore، clean. الـ working tree مشترك، وأي واحد منهم ممكن يمسح شغل سيشن تانية. `git status` و`git diff` بس.
- الـ ids بتاعتك بالبادئة اللي في الـ prompt بس. وماتغيّرش أي id موجود، لأنه مفتاح التقدم المحفوظ عند المستخدمين.

## 3. التدريج: من البسيط للعميق

الدرس كله سلّم. كل Level بيفترض إن القارئ قرا اللي قبله بس. ومفيش مصطلح ولا أداة بتظهر قبل ما تتشرح.

| المستوى | فيه إيه | ممنوع فيه |
| --- | --- | --- |
| `<Level n="1" title="الفكرة بتشبيه">` | `<Analogy>` من الحياة اليومية، و3 لـ 6 سطور بتوضّح المشكلة اللي الدرس بيحلها. ممكن `<Diagram>` واحد | الكود، والمصطلحات التقنية اللي مش متشرحة |
| `<Level n="2" title="الكود الأساسي">` | أصغر نسخة من الكود تشتغل فعلًا في Readly. كل مفهوم جديد بيتشرح في سطر أول ما يظهر. جدول لو في أكتر من أداة بتتقارن | الحالات الصعبة والتحسينات |
| `<Level n="3" title="...">` | المشاكل اللي بتظهر في الاستخدام الحقيقي، وكل `###` مشكلة واحدة: إيه اللي بيبوظ، وليه، والحل بالكود. الترتيب من الأشهر للأندر. **الكود هنا هو نفس class الـ Level 2 وهو بيكبر**، مش مثال جديد | — |
| `<Level n="4" title="قرارات الـ senior">` | الـ trade-offs، وامتى ماتستخدمش ده، وإزاي يكبر مع المشروع، كـ bullets بتبدأ بـ `<b>`. وفي الآخر `<Note kind="interview" title="سؤال interview">` فيه السؤال بين «» والإجابة القوية | — |

- بعد الـ Levels ممكن `<LessonPart title="قبل وبعد والكود">` لو في مقارنة قبل وبعد بتفيد، وده اختياري.
- في الآخر `<Quiz>` فيه **3 أسئلة بالظبط**: سهل (فهم)، ومتوسط (تطبيق)، ومتقدم (قرار أو حالة صعبة). الإجابة من سطر لـ 3.
- الـ frontmatter: `title`، و`description` (سطر بيقول الدرس عن إيه بأسلوب الكورس)، و`minutes` تقديري. **سيب `draft: true`.**

## 4. اللغة والأسلوب

- عامية مصرية زي باقي الكورس، والمصطلحات التقنية بالإنجليزي: «الـ Cubit بيعمل emit»، «الـ repository».
- جمل قصيرة ومباشرة، ومن غير مقدمات أو حشو. التشديد بـ `<b>..</b>` زي الكورس.
- الـ comments جوه الكود بالإنجليزي وقصيرة.
- الأمثلة كلها من Readly بس: auth وcatalog وlibrary وnotes وsettings.
- الـ stack: Cubit (flutter_bloc)، وdio، وgo_router، وflutter_localizations، وget_it (وinjectable في الوحدة 6)، وdrift للـ local DB. ماتجيبش state management تاني أو packages بديلة إلا كـ trade-off في Level 4.

## 5. أسماء Readly الثابتة (استخدمها زي ما هي)

| الحاجة | الاسم في الكورس |
| --- | --- |
| النتيجة | `sealed class Result<T>` ← `Success(:final value)` و`Err(:final failure)` |
| الأخطاء | `sealed class Failure(message)` ← `NetworkFailure`، `UnauthorizedFailure`، `ServerFailure(message, statusCode:)`، `CacheFailure`، `ValidationFailure` |
| التحويل | `guard<T>(...)` بيحوّل `DioException` لـ `Failure` في الـ data layer |
| الـ use case | class فيها `call(...)` وبترجع `Future<Result<T>>`، والـ params في class زي `SearchParams(query:, page:)` |
| الـ entities | `Book`، `BookId` (extension type)، `Email`، `Password` |
| library | `LibraryRepository` (contract)، `LibraryRepositoryImpl`، `LibraryRemoteSource`، `GetLibrary`، `AddBookToLibrary`، `LibraryCubit` بـ `LibraryLoading`/`LibraryLoaded`/`LibraryError` |
| catalog | `SearchBooks`، `CatalogSearchCubit` بـ `SearchIdle`/`SearchLoading`/`SearchLoaded`/`SearchError` |
| auth | `AuthCubit`، `AuthInterceptor(_tokens, _refreshDio, _dio)` (بيعدّي الطلبات اللي عليها `extra['skipAuth']`، وبيمسح الـ tokens بس لو الـ refresh رجع 401)، `TokenStore` (`accessToken`، `refreshToken`، `save`، `clear`، `onCleared`) |
| settings | `SettingsCubit` (في درس الترجمة) |
| offline | `AppDatabase` (drift)، `SyncService`، `Clock`/`SystemClock` |
| DI | `final getIt = GetIt.instance;`، والـ Cubits بـ `registerFactory` والباقي بـ `registerLazySingleton` |
| الترجمة | `AppLocalizations.of(context)!`، و`failure.localized(l10n)` |
| الـ UI | `BlocProvider(create: (_) => getIt<X>()..load())`، والـ `switch` على الـ state |
| auth (الدروس الجديدة) | `AuthState` ← `AuthUnknown`/`Authenticated`/`Unauthenticated(sessionExpired:)`، و`AuthRepository`/`AuthRepositoryImpl`، و`SignIn(SignInParams(email:, password:))`، و`LoginCubit` بـ `LoginFormState` و`FormStatus` |
| الصفحات | `PagedResult<T>(items:, hasMore:)`، و`CatalogRepository`/`CatalogRepositoryImpl`، و`CatalogRemoteSource`، و`CatalogCubit` بـ `CatalogLoading`/`CatalogLoaded(books:, hasReachedEnd:, loadMoreFailure:)`/`CatalogError`. والـ `CatalogCubit` هو `CatalogSearchCubit` بعد ما كبر، مش Cubit تاني |
| settings | `SettingsStore`/`SettingsStoreImpl` فوق `SharedPreferencesWithCache`، و`SettingsState(themeMode:, locale:)` |
| الـ logging | `AppLogger` (contract في `core`) ← `ConsoleLogger` في dev، و`SentryLogger` في prod |

لو احتجت اسم جديد، خليه بنفس النمط ده.

### أنماط ثابتة

- <b>الـ Cubits بتتسجل `registerFactory`</b>، ما عدا `AuthCubit`. ده بيتسجل `registerLazySingleton`، لأن كود بره الـ widget tree بيوصله بـ `getIt<AuthCubit>()` (الـ router والـ reset بعد الـ logout)، فلازم يبقى نفس النسخة. أما `SettingsCubit` فـ factory عادي، بس الـ provider بتاعه فوق الـ `MaterialApp`، فبيتعمل مرة واحدة بس.
- <b>الـ error اللي بيحصل والبيانات ظاهرة مش state لوحده.</b> زي error الصفحة 4 أو فشل الـ refresh، ده حقل جوه الـ Loaded state (`loadMoreFailure` أو `refreshFailure`)، فالبيانات تفضل والـ UI تعرض الخطأ في الـ footer أو في snackbar من `BlocListener`.
- <b>الـ bootstrap بالترتيب ده</b> (`main_<flavor>.dart` بينادي `bootstrap(config)`):

```dart
Future<void> bootstrap(AppConfig config) async {
  WidgetsFlutterBinding.ensureInitialized();
  await setupDependencies(config);        // async: loads prefs, clears stale Keychain
  // error handlers, then Bloc.observer (unit 8)
  await SentryFlutter.init(/* ... */, appRunner: () => runApp(const ReadlyApp()));
}
```

### الكود بيكبر مع الكورس

بعض الـ APIs بتتغير في دروس متأخرة. استخدم الشكل اللي يناسب <b>الوحدة اللي بتكتب فيها</b>، ماتستخدمش شكل لسه ماتشرحش:

| الـ API | قبل | من أول |
| --- | --- | --- |
| `SearchBooks` | بيرجّع `Future<Result<List<Book>>>` | درس الـ Pagination (`05-presentation/05`): بيرجّع `PagedResult<Book>` |
| `guard` | `guard(() async => ...)` | درس الـ Observability (`08-production/02`): بياخد `logger:` و`operation:` و`expected:` |
| `setupDependencies` | `void setupDependencies()` في درس الـ DI | درس الـ Settings (`06-di-scale/03`): `Future<void> setupDependencies(...) async` |

ولو انت اللي بتغيّر API في درسك، قول ده في `<Note kind="info" title="X اتغيّر هنا">`: كان إيه، وبقى إيه، ومين اللي بينادي عليه لازم يتغير.

## 6. قواعد الـ MDX

- كل الـ props strings: `n="1"` مش `n={1}`.
- أي `{` أو `}` في النص العادي بتتكتب `\{` و`\}`. جوه الـ code blocks وجوه الـ backticks مش محتاجة.
- أي generic type في النص العادي (`List<Book>`) لازم يبقى جوه backticks، وإلا الـ MDX هيفتكره tag.
- الـ tags بالشكل ده بالظبط، عشان الـ regex بيقراها: `<Level n="1" title="...">`، و`<Question id="...">` (والـ `id` أول attribute بـ double quotes)، وبعدها على طول `<Ask>..</Ask>` و`<Answer>..</Answer>`.
- سيب سطر فاضي بعد فتح أي component وقبل قفله لو جواه markdown، زي درس الـ Cubit بالظبط.
- الكود يتحط في `<CodeBlock label="...">` وجواه code block بـ ```` ```dart ````.
- الرسومات: SVG في `content/diagrams/`، وألوانها بـ `var(--ink)` و`var(--accent)` و`var(--warn)` و`var(--muted)` و`var(--surface)` و`var(--line)`. الأسهم بـ `marker-end="url(#mk-ink)"` (أو `mk-acc` أو `mk-warn` أو `mk-mut` أو `mk-good`)، والنص العربي بـ `class="ar" direction="rtl"`. ارسم بس لو الرسم بيوضح حاجة الكلام مش هيوضحها.
- ماتعملش Labs جديدة، لأن السجل بتاعها في `src/` وده ملف مشترك.

## 7. التحقق

```bash
node scripts/check-content.mjs <ملفاتك>
```

شغّله لحد ما يطلع من غير errors. السكريبت بيفحص:

- الـ compile بتاع الـ MDX
- الأقواس اللي مش متعمل لها escape
- الـ props اللي مش strings
- الـ components والرسومات والـ Labs اللي مش موجودة
- شكل الـ tags
- إن الـ ids مميزة في الموقع كله، والـ drafts داخلة في العد
- إن مفيش كلام فاضل من القالب
- إن الدرس فيه Levels من 1 لـ 4، وQuiz بـ 3 أسئلة، و`Note kind="interview"`

تحذير «Levels found [none]» في الدروس القديمة اللي مالهاش Levels (زي `02-request-journey` و`02-solid-in-readly`) متوقع وعادي.

## 8. لما تخلص

ابعت ملخص قصير بالعامية، فيه:

1. الملفات اللي اتعدّلت أو اتعملت.
2. الـ ids اللي اتضافت.
3. هيكل الدرس: عنوان كل Level والـ `###` اللي جواه.
4. **لسيشن التجميع:** مهمة أو اتنين مقترحين للـ `99-practice`، والمصطلحات الجديدة للـ glossary (المصطلح، المعنى، مثال من Readly)، وأي تعديل محتاجه بره ملفاتك.
5. نتيجة `check-content`.

وبعدين وقف. ماتبدأش أي حاجة تانية.
