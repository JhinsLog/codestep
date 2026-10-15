/* codestep: 출력 버퍼를 꺼서 printf가 그 줄에서 바로 출력되게 한다 (gcc -include로 끼워 넣음).
   사용자 코드의 줄 번호는 바뀌지 않는다. */
#include <stdio.h>
__attribute__((constructor)) static void codestep_unbuffered(void) { setvbuf(stdout, NULL, _IONBF, 0); }
