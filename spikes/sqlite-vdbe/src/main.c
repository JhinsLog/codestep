/*
** 실행기: setup SQL로 테이블을 만들고, query SQL의 문장 하나를 계측한 채
** 실행한다.
**
**   Module.ccall('codestep_run', ...)   브라우저(WASM)에서 호출
**
** 출력(JSON 한 줄씩, stdout):
**   {"t":"schema",...}  루트 페이지 → 테이블/인덱스 이름과 열 이름
**   {"t":"op",...}      실행된 opcode (hook.c)
**   {"t":"reg",...}     직전 opcode가 레지스터에 쓴 값 (hook.c)
**   {"t":"table",...}   실행 전 테이블 내용 (화면에 그릴 원본)
**   {"t":"error",...}   준비·실행 오류
**   {"t":"done",...}    실행 결과
*/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "sqlite3.h"

void codestep_trace_begin(void);
void codestep_trace_end(void);

static void emitString(const char *z){
  putchar('"');
  for(; z && *z; z++){
    unsigned char c = (unsigned char)*z;
    if( c=='"' || c=='\\' ) printf("\\%c", c);
    else if( c<0x20 ) printf("\\u%04x", c);
    else putchar(c);
  }
  putchar('"');
}

static void emitError(const char *zWhere, const char *zMsg){
  printf("{\"t\":\"error\",\"where\":\"%s\",\"msg\":", zWhere);
  emitString(zMsg);
  printf("}\n");
}

static void emitSchema(sqlite3 *db){
  sqlite3_stmt *pStmt;
  sqlite3_prepare_v2(db,
    "SELECT s.type, s.name, s.tbl_name, s.rootpage,"
    "  (SELECT json_group_array(name) FROM ("
    "     SELECT name, cid FROM pragma_table_info(s.name) WHERE s.type='table'"
    "     UNION ALL"
    "     SELECT name, seqno FROM pragma_index_info(s.name) WHERE s.type='index'"
    "     ORDER BY 2))"
    " FROM sqlite_schema s WHERE s.rootpage>0", -1, &pStmt, 0);
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    printf("{\"t\":\"schema\",\"type\":\"%s\",\"name\":",
           sqlite3_column_text(pStmt, 0));
    emitString((const char*)sqlite3_column_text(pStmt, 1));
    printf(",\"table\":");
    emitString((const char*)sqlite3_column_text(pStmt, 2));
    printf(",\"root\":%d,\"cols\":%s}\n",
           sqlite3_column_int(pStmt, 3), sqlite3_column_text(pStmt, 4));
  }
  sqlite3_finalize(pStmt);
}

/* 테이블마다 rowid와 전체 행을 JSON 배열로 내보낸다 (행 수 상한 200). */
static void emitTables(sqlite3 *db){
  sqlite3_stmt *pList, *pRows;
  sqlite3_prepare_v2(db,
    "SELECT name FROM sqlite_schema WHERE type='table'"
    " AND name NOT LIKE 'sqlite_%' ORDER BY name", -1, &pList, 0);
  while( sqlite3_step(pList)==SQLITE_ROW ){
    const char *zName = (const char*)sqlite3_column_text(pList, 0);
    /* json_array(rowid, *)는 허용되지 않으므로 열을 직접 나열한다 */
    sqlite3_stmt *pCols;
    char *zSql;
    char *zCols = sqlite3_mprintf("rowid");
    char *zQ = sqlite3_mprintf("SELECT name FROM pragma_table_info(%Q)", zName);
    sqlite3_prepare_v2(db, zQ, -1, &pCols, 0);
    while( sqlite3_step(pCols)==SQLITE_ROW ){
      char *z = sqlite3_mprintf("%s, \"%w\"", zCols, sqlite3_column_text(pCols, 0));
      sqlite3_free(zCols);
      zCols = z;
    }
    sqlite3_finalize(pCols);
    sqlite3_free(zQ);
    zSql = sqlite3_mprintf(
      "SELECT json_group_array(json_array(%s)) FROM"
      " (SELECT rowid, * FROM \"%w\" ORDER BY rowid LIMIT 200)", zCols, zName);
    sqlite3_free(zCols);
    if( sqlite3_prepare_v2(db, zSql, -1, &pRows, 0)==SQLITE_OK
     && sqlite3_step(pRows)==SQLITE_ROW ){
      printf("{\"t\":\"table\",\"name\":");
      emitString(zName);
      printf(",\"rows\":%s}\n", sqlite3_column_text(pRows, 0));
    }
    sqlite3_finalize(pRows);
    sqlite3_free(zSql);
  }
  sqlite3_finalize(pList);
}

/* 실행 상한: 이 수를 넘는 VDBE 명령을 실행하면 중단한다. */
static int progressLimit(void *pArg){
  int *pn = (int*)pArg;
  return ++(*pn) > 500;    /* 100 opcode × 500 = 약 5만 opcode */
}

int codestep_run(const char *zSetup, const char *zQuery){
  sqlite3 *db;
  sqlite3_stmt *pStmt;
  char *zErr = 0;
  int rc, nRow = 0, nTick = 0;

  sqlite3_open(":memory:", &db);
  if( sqlite3_exec(db, zSetup, 0, 0, &zErr)!=SQLITE_OK ){
    emitError("setup", zErr);
    sqlite3_free(zErr);
    sqlite3_close(db);
    return 1;
  }
  emitSchema(db);
  emitTables(db);

  rc = sqlite3_prepare_v2(db, zQuery, -1, &pStmt, 0);
  if( rc!=SQLITE_OK || pStmt==0 ){
    emitError("prepare", rc!=SQLITE_OK ? sqlite3_errmsg(db) : "빈 쿼리");
    sqlite3_close(db);
    return 1;
  }

  sqlite3_progress_handler(db, 100, progressLimit, &nTick);
  codestep_trace_begin();
  while( (rc = sqlite3_step(pStmt))==SQLITE_ROW ) nRow++;
  codestep_trace_end();
  if( rc!=SQLITE_DONE ) emitError("step", sqlite3_errmsg(db));

  printf("{\"t\":\"done\",\"rc\":%d,\"rows\":%d}\n", rc, nRow);
  fflush(stdout);
  sqlite3_finalize(pStmt);
  sqlite3_close(db);
  return 0;
}
