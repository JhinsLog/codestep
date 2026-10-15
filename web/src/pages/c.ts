// C 학습 화면 (실행: 서버의 gcc + gdb 추적 컨테이너)
import { cpp } from '@codemirror/lang-cpp';
import { C_SAMPLES } from '../c/samples';
import { mountCode, type CodePreset, type LangConfig } from './code';

export const C_LANG: LangConfig = {
  id: 'c', name: 'C', samples: C_SAMPLES, language: cpp,
  wait: '컴파일하고 gdb로 한 줄씩 실행하는 중… (보통 1~2초)',
};

export const mountC = (root: HTMLElement, preset?: CodePreset) => mountCode(root, C_LANG, preset);
