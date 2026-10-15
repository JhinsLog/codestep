/*
** 프로토타입 실행기: setup.sql로 테이블을 만들고, query.sql의 문장 하나를
** 계측한 채 실행한다.
**
**   node build/trace.js <setup.sql> <query.sql>
**
** 출력(JSON 한 줄씩):
**   {"t":"schema",...}  루트 페이지 → 테이블/인덱스 이름과 열 이름
**   {"t":"op",...}      실행된 opcode (hook.c)
**   {"t":"reg",...}     직전 opcode가 레지스터에 쓴 값 (hook.c)
**   {"t":"done",...}    실행 결과
*/
#include <stdio.h>
#include <stdlib.h>
#include "sqlite3.h"

void codestep_trace_begin(void);
void codestep_trace_end(void);

static char *readFile(const char *zPath){
  FILE *f = fopen(zPath, "rb");
  long n;
  char *z;
  if( f==0 ){ fprintf(stderr, "cannot open %s\n", zPath); exit(1); }
  fseek(f, 0, SEEK_END); n = ftell(f); fseek(f, 0, SEEK_SET);
  z = malloc(n+1);
  if( fread(z, 1, n, f)!=(size_t)n ){ fprintf(stderr, "read failed\n"); exit(1); }
  z[n] = 0;
  fclose(f);
  return z;
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
    printf("{\"t\":\"schema\",\"type\":\"%s\",\"name\":\"%s\",\"table\":\"%s\","
           "\"root\":%d,\"cols\":%s}\n",
           sqlite3_column_text(pStmt, 0), sqlite3_column_text(pStmt, 1),
           sqlite3_column_text(pStmt, 2), sqlite3_column_int(pStmt, 3),
           sqlite3_column_text(pStmt, 4));
  }
  sqlite3_finalize(pStmt);
}

int main(int argc, char **argv){
  sqlite3 *db;
  sqlite3_stmt *pStmt;
  char *zErr = 0;
  int rc, nRow = 0;

  if( argc!=3 ){ fprintf(stderr, "usage: trace <setup.sql> <query.sql>\n"); return 1; }
  sqlite3_open(":memory:", &db);
  if( sqlite3_exec(db, readFile(argv[1]), 0, 0, &zErr)!=SQLITE_OK ){
    fprintf(stderr, "setup: %s\n", zErr); return 1;
  }
  emitSchema(db);

  rc = sqlite3_prepare_v2(db, readFile(argv[2]), -1, &pStmt, 0);
  if( rc!=SQLITE_OK ){ fprintf(stderr, "prepare: %s\n", sqlite3_errmsg(db)); return 1; }

  codestep_trace_begin();
  while( (rc = sqlite3_step(pStmt))==SQLITE_ROW ) nRow++;
  codestep_trace_end();

  printf("{\"t\":\"done\",\"rc\":%d,\"rows\":%d}\n", rc, nRow);
  sqlite3_finalize(pStmt);
  sqlite3_close(db);
  return 0;
}
