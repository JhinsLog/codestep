// CodeMirror 6 편집기 + 중단점 거터 + 현재 줄·오류 줄 표시.
//
// 두 가지 모드:
//   편집 모드  — 코드를 고친다
//   디버그 모드 — 읽기 전용. 줄을 누르면 그 줄이 실행된 직후로 이동한다(onLineClick)
import { EditorState, RangeSet, StateEffect, StateField, Compartment, type Extension } from '@codemirror/state';
import {
  EditorView, Decoration, GutterMarker, gutter, keymap, lineNumbers,
  highlightActiveLine, drawSelection, type DecorationSet,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching } from '@codemirror/language';

// ── 중단점 ────────────────────────────────────────────

const toggleBreakpoint = StateEffect.define<{ pos: number; on: boolean }>({
  map: (v, ch) => ({ pos: ch.mapPos(v.pos), on: v.on }),
});

const breakpointMarker = new (class extends GutterMarker {
  override toDOM() {
    const d = document.createElement('span');
    d.className = 'cm-bp-dot';
    d.textContent = '●';
    return d;
  }
})();

const breakpointField = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update(set, tr) {
    set = set.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(toggleBreakpoint)) continue;
      set = e.value.on
        ? set.update({ add: [breakpointMarker.range(e.value.pos)] })
        : set.update({ filter: (from) => from !== e.value.pos });
    }
    return set;
  },
});

// ── 현재 줄 / 오류 줄 ─────────────────────────────────

const setMarks = StateEffect.define<{ current: number | null; errors: number[]; kind: 'line' | 'return' | 'exception' }>();

const marksField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(setMarks)) continue;
      const ranges = [];
      const doc = tr.state.doc;
      const lines = new Set<number>();
      for (const l of e.value.errors) {
        if (l >= 1 && l <= doc.lines && !lines.has(l)) {
          lines.add(l);
          ranges.push(Decoration.line({ class: 'cm-error-line' }).range(doc.line(l).from));
        }
      }
      const c = e.value.current;
      if (c !== null && c >= 1 && c <= doc.lines) {
        ranges.push(Decoration.line({ class: `cm-current-line cm-current-${e.value.kind}` }).range(doc.line(c).from));
      }
      ranges.sort((a, b) => a.from - b.from);
      deco = Decoration.set(ranges, true);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ── 편집기 ────────────────────────────────────────────

export interface EditorOptions {
  parent: HTMLElement;
  doc: string;
  language: Extension;
  onLineClick: (line: number) => void;     // 디버그 모드에서 줄을 눌렀을 때
  onBreakpoints: (lines: Set<number>) => void;
  onChange: (doc: string) => void;
}

export class CodeEditor {
  readonly view: EditorView;
  private readonly readOnly = new Compartment();
  private debugging = false;

  constructor(private readonly opts: EditorOptions) {
    const bpGutter = gutter({
      class: 'cm-bp-gutter',
      markers: (v) => v.state.field(breakpointField),
      initialSpacer: () => breakpointMarker,
      domEventHandlers: {
        mousedown: (view, block) => {
          this.toggleBreakpointAt(block.from);
          return true;
        },
      },
    });

    this.view = new EditorView({
      parent: opts.parent,
      state: EditorState.create({
        doc: opts.doc,
        extensions: [
          breakpointField,
          marksField,
          bpGutter,
          lineNumbers(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          highlightActiveLine(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          opts.language,
          this.readOnly.of([]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) opts.onChange(u.state.doc.toString());
          }),
          EditorView.domEventHandlers({
            mousedown: (ev, view) => {
              if (!this.debugging) return false;
              const pos = view.posAtCoords({ x: ev.clientX, y: ev.clientY });
              if (pos === null) return false;
              opts.onLineClick(view.state.doc.lineAt(pos).number);
              return true;
            },
          }),
        ],
      }),
    });
  }

  get doc(): string {
    return this.view.state.doc.toString();
  }

  setDoc(doc: string): void {
    this.view.dispatch({ changes: { from: 0, to: this.view.state.doc.length, insert: doc } });
  }

  setDebugging(on: boolean): void {
    this.debugging = on;
    this.view.dispatch({ effects: this.readOnly.reconfigure(on ? EditorState.readOnly.of(true) : []) });
    this.view.dom.classList.toggle('cm-debugging', on);
    if (!on) this.mark(null, [], 'line');
  }

  /** 현재 실행 줄과 오류 줄 표시 */
  mark(current: number | null, errors: number[], kind: 'line' | 'return' | 'exception'): void {
    this.view.dispatch({ effects: setMarks.of({ current, errors, kind }) });
    if (current !== null && current >= 1 && current <= this.view.state.doc.lines) {
      const pos = this.view.state.doc.line(current).from;
      this.view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: 'nearest' }) });
    }
  }

  private toggleBreakpointAt(pos: number): void {
    let on = true;
    this.view.state.field(breakpointField).between(pos, pos, () => { on = false; });
    this.view.dispatch({ effects: toggleBreakpoint.of({ pos, on }) });
    this.opts.onBreakpoints(this.breakpointLines());
  }

  breakpointLines(): Set<number> {
    const lines = new Set<number>();
    const doc = this.view.state.doc;
    this.view.state.field(breakpointField).between(0, doc.length, (from) => {
      lines.add(doc.lineAt(from).number);
    });
    return lines;
  }
}
