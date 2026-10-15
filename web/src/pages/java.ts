// Java 학습 화면 (실행: 서버의 JDI 추적 컨테이너)
import { java } from '@codemirror/lang-java';
import { JAVA_SAMPLES } from '../java/samples';
import { mountCode, type CodePreset, type LangConfig } from './code';

export const JAVA: LangConfig = {
  id: 'java', name: 'Java', samples: JAVA_SAMPLES, language: java,
  wait: '컴파일하고 실행하는 중… (보통 2~4초)',
};

export const mountJava = (root: HTMLElement, preset?: CodePreset) => mountCode(root, JAVA, preset);
