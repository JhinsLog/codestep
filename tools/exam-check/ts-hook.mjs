// node가 확장자 없는 import(./sims/paging)를 찾도록 .ts를 붙여 준다 (검증 도구 전용)
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); } catch (e) {
    if (spec.startsWith('.') && !spec.endsWith('.ts')) return next(spec + '.ts', ctx);
    throw e;
  }
}
