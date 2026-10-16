// node가 확장자 없는 import(./sims/paging, ./rounds)를 찾도록 .ts나 /index.ts를 붙여 준다 (검증 도구 전용)
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); } catch (e) {
    if (!spec.startsWith('.') || spec.endsWith('.ts')) throw e;
    try { return await next(spec + '.ts', ctx); } catch { return next(spec + '/index.ts', ctx); }
  }
}
