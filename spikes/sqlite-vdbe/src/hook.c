/*
** codestep SQLite 계측 훅.
**
** sqlite3.c를 같은 번역 단위로 포함해 Vdbe·VdbeCursor 내부 구조에 접근한다.
** build.sh가 sqlite3VdbeExec 루프 맨 앞에 codestep_vdbe_hook(p, pOp)
** 호출을 넣는다. 훅은 "opcode가 실행되기 직전"에 불리므로, 직전 opcode가
** 레지스터에 쓴 값은 다음 호출 때 읽어서 내보낸다.
**
** 출력: 한 줄에 JSON 하나 (stdout). 해석은 web/src/sql/steps.ts가 한다.
*/
#include "sqlite3.c"

static int csEnabled = 0;
static Vdbe *csPrevVdbe = 0;
static Op *csPrevOp = 0;

static void csEmitString(const unsigned char *z, int n){
  int i;
  putchar('"');
  for(i=0; i<n; i++){
    unsigned char c = z[i];
    if( c=='"' || c=='\\' ) printf("\\%c", c);
    else if( c<0x20 ) printf("\\u%04x", c);
    else putchar(c);
  }
  putchar('"');
}

/* 레지스터 값을 내보낸다. sqlite3_value_text() 같은 API는 값을 문자열로 바꾸거나
** 복사본을 만들며 레지스터를 고치므로(실행 중인 VM의 상태가 바뀐다) 쓰지 않고,
** Mem의 필드를 읽기만 한다. RIGHT JOIN처럼 레지스터를 다시 쓰는 쿼리에서
** API로 읽으면 VM이 망가졌다. */
static void csEmitMem(Mem *pMem){
  u16 f = pMem->flags;
  if( f & MEM_Null ){
    printf("null");
  }else if( f & MEM_Int ){
    printf("%lld", pMem->u.i);
  }else if( f & MEM_IntReal ){
    printf("%.17g", (double)pMem->u.i);
  }else if( f & MEM_Real ){
    printf("%.17g", pMem->u.r);
  }else if( (f & MEM_Str) && pMem->z ){
    csEmitString((const unsigned char*)pMem->z, pMem->n);
  }else if( f & MEM_Blob ){
    printf("{\"blob\":%d}", pMem->n);
  }else{
    printf("null");
  }
}

/* 커서가 지금 가리키는 행의 rowid. 알 수 없으면 0을 돌려준다. */
static int csCursorRowid(Vdbe *p, int iCur, i64 *pRowid){
  VdbeCursor *pC;
  if( iCur<0 || iCur>=p->nCursor ) return 0;
  pC = p->apCsr[iCur];
  if( pC==0 || pC->eCurType!=CURTYPE_BTREE || pC->nullRow ) return 0;
  if( pC->deferredMoveto ){
    *pRowid = pC->movetoTarget;
    return 1;
  }
  if( pC->uc.pCursor==0 || !sqlite3BtreeCursorIsValidNN(pC->uc.pCursor) ){
    return 0;
  }
  if( pC->isTable ){
    *pRowid = sqlite3BtreeIntegerKey(pC->uc.pCursor);
    return 1;
  }
  /* 인덱스 커서: 인덱스 항목이 가리키는 테이블 rowid */
  return sqlite3VdbeIdxRowid(p->db, pC->uc.pCursor, pRowid)==SQLITE_OK;
}

/* 직전 opcode의 결과 레지스터를 내보낸다. */
static void csEmitResult(Vdbe *p, Op *pOp){
  switch( pOp->opcode ){
    case OP_Column:
    case OP_Rowid:
    case OP_Integer:
    case OP_String8:
    case OP_String:
    case OP_Add: case OP_Subtract: case OP_Multiply: case OP_Divide:
    case OP_Function: {
      /* Integer·String은 p2에, 나머지는 p3에 결과를 쓴다 */
      int r = (pOp->opcode==OP_Integer || pOp->opcode==OP_String8
               || pOp->opcode==OP_String) ? pOp->p2 : pOp->p3;
      printf("{\"t\":\"reg\",\"pc\":%d,\"r\":%d,\"v\":",
             (int)(pOp - p->aOp), r);
      csEmitMem(&p->aMem[r]);
      printf("}\n");
      break;
    }
  }
}

static void codestep_vdbe_hook(Vdbe *p, Op *pOp){
  int pc;
  i64 rowid;
  if( !csEnabled ) return;
  if( csPrevOp && csPrevVdbe==p ) csEmitResult(p, csPrevOp);

  pc = (int)(pOp - p->aOp);
  printf("{\"t\":\"op\",\"pc\":%d,\"op\":\"%s\",\"p1\":%d,\"p2\":%d,\"p3\":%d,\"p5\":%d",
         pc, sqlite3OpcodeName(pOp->opcode),
         pOp->p1, pOp->p2, pOp->p3, pOp->p5);
  switch( pOp->opcode ){
    case OP_OpenRead:
    case OP_OpenWrite:
      printf(",\"root\":%d", pOp->p2);
      break;
    case OP_Column:
    case OP_Rowid:
    case OP_IdxRowid:
      if( csCursorRowid(p, pOp->p1, &rowid) ) printf(",\"rowid\":%lld", rowid);
      break;
    case OP_ResultRow: {
      int i;
      printf(",\"row\":[");
      for(i=0; i<pOp->p2; i++){
        if( i ) putchar(',');
        csEmitMem(&p->aMem[pOp->p1+i]);
      }
      printf("]");
      break;
    }
  }
  printf("}\n");
  csPrevVdbe = p;
  csPrevOp = pOp;
}

void codestep_trace_begin(void){ csEnabled = 1; csPrevVdbe = 0; csPrevOp = 0; }
void codestep_trace_end(void){ csEnabled = 0; csPrevVdbe = 0; csPrevOp = 0; }
