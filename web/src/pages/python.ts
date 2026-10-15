// Python 학습 화면 (실행: 서버의 sys.settrace 추적 컨테이너)
import { python } from '@codemirror/lang-python';
import { PYTHON_SAMPLES } from '../python/samples';
import { mountCode, type CodePreset, type LangConfig } from './code';

export const PYTHON: LangConfig = {
  id: 'python', name: 'Python', samples: PYTHON_SAMPLES, language: python,
  wait: '실행하는 중… (보통 1초 안팎)',
};

export const mountPython = (root: HTMLElement, preset?: CodePreset) => mountCode(root, PYTHON, preset);
