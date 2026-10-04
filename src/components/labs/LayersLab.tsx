"use client";
import { useState } from "react";

type ImportQ = { file: string; code: string; ok: boolean; why: string };
type SortQ = { item: string; layer: "Presentation" | "Domain" | "Data"; why: string };

const IMPORTS: ImportQ[] = [
  { file: "library/presentation/library_cubit.dart", code: "import '../domain/add_book_to_library.dart';", ok: true, why: "الـ Presentation بتعتمد على الـ Domain، وده الاتجاه الصح." },
  { file: "library/presentation/library_cubit.dart", code: "import '../data/library_remote_source.dart';", ok: false, why: "الـ Cubit مايعرفش الـ Data. بيكلّم use case أو repository contract من الـ Domain." },
  { file: "library/data/library_repository_impl.dart", code: "import '../domain/library_repository.dart';", ok: true, why: "الـ Data بتنفّذ contract معرّف في الـ Domain. ده الـ Dependency Inversion." },
  { file: "library/domain/add_book_to_library.dart", code: "import 'package:dio/dio.dart';", ok: false, why: "الـ Domain مايعرفش أي أداة خارجية. dio مكانه الـ Data بس." },
  { file: "library/domain/book.dart", code: "import 'package:flutter/material.dart';", ok: false, why: "الـ Domain Dart صافي. لو احتاج Flutter يبقى في حاجة في مكان غلط." },
  { file: "library/data/book_dto.dart", code: "import 'package:freezed_annotation/freezed_annotation.dart';", ok: true, why: "الـ Data تقدر تستخدم أدوات الـ codegen، لأن الـ DTO شكل الـ JSON." },
  { file: "notes/domain/add_note.dart", code: "import 'package:feature_library/feature_library.dart';", ok: true, why: "ده الـ public API (الـ barrel) بتاع feature الـ library، فمسموح." },
  { file: "notes/domain/add_note.dart", code: "import 'package:feature_library/src/data/library_repository_impl.dart';", ok: false, why: "ده internals feature تانية. استخدم BookLookup من الـ public API." },
  { file: "library/domain/library_repository.dart", code: "import '../data/book_dto.dart';", ok: false, why: "الـ contract بيرجّع entities بس. لو عرف الـ DTO، شكل الـ API هيتسرب للـ Domain." },
  { file: "library/presentation/library_view.dart", code: "import 'package:readly/l10n/app_localizations.dart';", ok: true, why: "الترجمة جزء من الـ Presentation، فطبيعي الـ view تستخدمها." },
];

const SORT: SortQ[] = [
  { item: "BookDto.fromJson", layer: "Data", why: "الـ DTO بيمثل شكل الـ JSON، ومكانه الـ Data." },
  { item: "AddBookToLibrary (قاعدة «مفيش كتاب مكرر»)", layer: "Domain", why: "قاعدة business، يبقى use case في الـ Domain." },
  { item: "LibraryCubit", layer: "Presentation", why: "الـ Cubit بيدير state الشاشة." },
  { item: "abstract interface class LibraryRepository", layer: "Domain", why: "الـ contract بيعرّفه الـ Domain، والـ Data بتنفّذه." },
  { item: "LibraryRepositoryImpl", layer: "Data", why: "التنفيذ اللي بيستخدم dio وdrift." },
  { item: "extension FailureL10n (ترجمة الخطأ لنص)", layer: "Presentation", why: "اختيار النص حسب اللغة شغلة الـ UI." },
  { item: "Email value object", layer: "Domain", why: "قيمة بقواعدها، مالهاش علاقة بأي أداة." },
  { item: "AuthInterceptor", layer: "Data", why: "جزء من إعداد الشبكة (dio)." },
  { item: "BlocListener بيعمل navigation بعد الحفظ", layer: "Presentation", why: "side effect في الـ UI." },
  { item: "guard() بيحوّل DioException لـ Failure", layer: "Data", why: "التحويل بيحصل عند حد الـ repository." },
];

function useRound<T>(items: T[]) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState<{ ok: boolean; picked: string } | null>(null);
  const finished = i >= items.length;
  return {
    item: finished ? null : items[i], i, score, answer, finished,
    pick(ok: boolean, picked: string) { if (answer || finished) return; setAnswer({ ok, picked }); if (ok) setScore((s) => s + 1); },
    next() { if (finished) { setI(0); setScore(0); } else setI((n) => n + 1); setAnswer(null); },
  };
}

function Feedback({ ok, why }: { ok: boolean; why: string }) {
  return <div className={`feedback ${ok ? "good" : "bad"}`}><b>{ok ? "صح." : "مش بالظبط."}</b> {why}</div>;
}

export default function LayersLab() {
  const a = useRound(IMPORTS);
  const b = useRound(SORT);
  return (
    <section className="lab">
      <h2>القاعدة الذهبية</h2>
      <p>جولتين: في الأولى بتقرر الـ import مسموح ولا ممنوع، وفي التانية بتحط كل حاجة في طبقتها. كل إجابة معاها تفسير.</p>

      <div className="game">
        <div className="game-head"><b>الجولة ١: الـ import ده مسموح؟</b><span className="score">{a.finished ? "" : `${a.i + 1} / ${IMPORTS.length}`}</span></div>
        {a.item ? (
          <div className="game-card">
            <small className="file" dir="ltr">{a.item.file}</small>
            <pre className="mini">{a.item.code}</pre>
            <div className="game-actions">
              <button className={`btn${a.answer?.picked === "yes" ? " picked" : ""}`} type="button" disabled={!!a.answer} onClick={() => a.pick(a.item!.ok, "yes")}>مسموح</button>
              <button className={`btn warn${a.answer?.picked === "no" ? " picked" : ""}`} type="button" disabled={!!a.answer} onClick={() => a.pick(!a.item!.ok, "no")}>ممنوع</button>
            </div>
            {a.answer && <Feedback ok={a.answer.ok} why={a.item.why} />}
            {a.answer && <button className="btn ghost" type="button" onClick={a.next} style={{ marginTop: 10 }}>التالي</button>}
          </div>
        ) : (
          <div className="game-card">
            <div className="feedback done-msg">خلصت الجولة: {a.score} من {IMPORTS.length}. {a.score === IMPORTS.length ? "ممتاز!" : "ارجع للفصل وراجع اللي غلطت فيه."}</div>
            <button className="btn ghost" type="button" onClick={a.next} style={{ marginTop: 10 }}>العب تاني</button>
          </div>
        )}
      </div>

      <div className="game">
        <div className="game-head"><b>الجولة ٢: ده مكانه أنهي طبقة؟</b><span className="score">{b.finished ? "" : `${b.i + 1} / ${SORT.length}`}</span></div>
        {b.item ? (
          <div className="game-card">
            <div className="sort-item"><code>{b.item.item}</code></div>
            <div className="game-actions">
              {(["Presentation", "Domain", "Data"] as const).map((layer) => (
                <button key={layer} className={`btn ghost${b.answer?.picked === layer ? " picked" : ""}`} type="button" disabled={!!b.answer}
                  onClick={() => b.pick(layer === b.item!.layer, layer)}>{layer}</button>
              ))}
            </div>
            {b.answer && <Feedback ok={b.answer.ok} why={b.item.why} />}
            {b.answer && <button className="btn ghost" type="button" onClick={b.next} style={{ marginTop: 10 }}>التالي</button>}
          </div>
        ) : (
          <div className="game-card">
            <div className="feedback done-msg">خلصت الجولة: {b.score} من {SORT.length}. {b.score === SORT.length ? "ممتاز!" : "ارجع للفصل وراجع اللي غلطت فيه."}</div>
            <button className="btn ghost" type="button" onClick={b.next} style={{ marginTop: 10 }}>العب تاني</button>
          </div>
        )}
      </div>
    </section>
  );
}
