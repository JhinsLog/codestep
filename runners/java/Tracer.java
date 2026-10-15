import com.sun.jdi.*;
import com.sun.jdi.connect.*;
import com.sun.jdi.event.*;
import com.sun.jdi.request.*;

import javax.tools.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;

/**
 * codestep Java 추적기.
 *
 * 표준입력으로 받은 소스를 -g로 컴파일하고, JDI로 디버기 JVM을 띄워 사용자 클래스의
 * 줄 단위 실행을 기록한다. 결과는 Trace JSON 하나를 표준출력에 쓴다.
 * 형식은 web/src/trace/types.ts의 Trace와 같다 (뷰는 어느 언어가 만들었는지 모른다).
 *
 * 컨테이너 안에서만 실행한다: runners/java/Dockerfile, server/api.mjs 참고.
 */
public final class Tracer {
    static final int MAX_STEPS = Integer.getInteger("codestep.maxSteps", 3000);
    static final long MAX_MILLIS = Long.getLong("codestep.maxMillis", 8000);
    static final int MAX_HEAP = 120;       // 한 단계에 기록하는 힙 객체 수 상한
    static final int MAX_ITEMS = 64;       // 배열·컬렉션 원소 상한
    static final int MAX_OUT = 64 * 1024;  // 표준출력 상한 (바이트)
    static final String[] EXCLUDE = {"java.*", "javax.*", "jdk.*", "sun.*", "com.sun.*", "org.w3c.*", "org.xml.*"};

    final Path work;
    final String source;
    final StringBuilder out = new StringBuilder();
    final List<String> steps = new ArrayList<>();
    String mainClass;
    VirtualMachine vm;
    InputStream vmOut, vmErr;
    boolean cut;
    String error;  // 이미 JSON으로 만든 오류 객체
    long started;

    Tracer(Path work, String source) {
        this.work = work;
        this.source = source;
    }

    public static void main(String[] args) throws Exception {
        String src = new String(System.in.readAllBytes(), StandardCharsets.UTF_8);
        Path work = Paths.get(args.length > 0 ? args[0] : "/work");
        Tracer t = new Tracer(work, src);
        String json;
        try {
            json = t.run();
        } catch (Throwable e) {
            json = "{\"lang\":\"java\",\"steps\":[],\"stdout\":\"\",\"cut\":false,\"error\":{\"kind\":\"internal\",\"message\":"
                + Json.str(String.valueOf(e)) + "}}";
        }
        PrintStream ps = new PrintStream(new FileOutputStream(FileDescriptor.out), true, StandardCharsets.UTF_8);
        ps.println(json);
        ps.flush();
        System.exit(0);
    }

    // ── 1. 컴파일 ──────────────────────────────────────────

    static final Pattern PUBLIC_CLASS = Pattern.compile("public\\s+(?:final\\s+|abstract\\s+)*class\\s+([A-Za-z_$][\\w$]*)");
    static final Pattern ANY_CLASS = Pattern.compile("\\bclass\\s+([A-Za-z_$][\\w$]*)");
    static final Pattern PACKAGE = Pattern.compile("^\\s*package\\s+", Pattern.MULTILINE);

    String run() throws Exception {
        if (PACKAGE.matcher(source).find()) {
            return result(errorJson("compile", "package 선언은 쓰지 마세요. 기본 패키지의 클래스만 실행할 수 있습니다.", 0));
        }
        Matcher m = PUBLIC_CLASS.matcher(source);
        String fileClass = m.find() ? m.group(1) : null;
        if (fileClass == null) {
            Matcher a = ANY_CLASS.matcher(source);
            fileClass = a.find() ? a.group(1) : "Main";
        }
        Path classes = work.resolve("classes");
        Files.createDirectories(classes);
        Path file = work.resolve(fileClass + ".java");
        Files.writeString(file, source, StandardCharsets.UTF_8);

        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> diags = new DiagnosticCollector<>();
        try (StandardJavaFileManager fm = javac.getStandardFileManager(diags, Locale.KOREAN, StandardCharsets.UTF_8)) {
            boolean ok = javac.getTask(null, fm, diags,
                    List.of("-g", "-encoding", "UTF-8", "-d", classes.toString(), "-proc:none", "-Xlint:none"),
                    null, fm.getJavaFileObjects(file)).call();
            if (!ok) {
                StringBuilder sb = new StringBuilder();
                int firstLine = 0;
                for (Diagnostic<? extends JavaFileObject> d : diags.getDiagnostics()) {
                    if (d.getKind() != Diagnostic.Kind.ERROR) continue;
                    if (sb.length() > 0) sb.append(',');
                    int line = (int) d.getLineNumber();
                    if (firstLine == 0) firstLine = line;
                    sb.append("{\"line\":").append(line).append(",\"col\":").append(d.getColumnNumber())
                      .append(",\"message\":").append(Json.str(d.getMessage(Locale.KOREAN))).append('}');
                }
                return result("{\"kind\":\"compile\",\"message\":\"컴파일 오류\",\"line\":" + firstLine
                        + ",\"diagnostics\":[" + sb + "]}");
            }
        }
        mainClass = findMain(classes, fileClass);
        if (mainClass == null) {
            return result(errorJson("compile", "public static void main(String[] args) 메서드가 있는 클래스가 없습니다.", 0));
        }
        trace(classes);
        return result(error);
    }

    /**
     * main 메서드를 가진 최상위 클래스. 파일 이름이 된 클래스를 먼저 본다.
     * 클래스를 불러오기만 하고 초기화하지 않으므로 사용자 코드는 실행되지 않는다.
     */
    String findMain(Path classes, String preferred) throws IOException {
        List<String> names = new ArrayList<>();
        try (DirectoryStream<Path> ds = Files.newDirectoryStream(classes, "*.class")) {
            for (Path f : ds) {
                String n = f.getFileName().toString();
                n = n.substring(0, n.length() - ".class".length());
                if (!n.contains("$")) names.add(n);
            }
        }
        names.sort(Comparator.comparing((String n) -> !n.equals(preferred)).thenComparing(n -> n));
        try (java.net.URLClassLoader cl = new java.net.URLClassLoader(new java.net.URL[]{classes.toUri().toURL()}, null)) {
            for (String n : names) {
                try {
                    Class<?> c = Class.forName(n, false, cl);
                    java.lang.reflect.Method m = c.getDeclaredMethod("main", String[].class);
                    if (java.lang.reflect.Modifier.isStatic(m.getModifiers())) return n;
                } catch (ReflectiveOperationException | LinkageError ignored) { }
            }
        }
        return null;
    }

    // ── 2. 추적 ────────────────────────────────────────────

    void trace(Path classes) throws Exception {
        LaunchingConnector conn = Bootstrap.virtualMachineManager().defaultConnector();
        Map<String, Connector.Argument> a = conn.defaultArguments();
        a.get("main").setValue(mainClass);
        a.get("options").setValue("-cp " + classes + " -Xmx64m -Xss1m -XX:+UseSerialGC -XX:TieredStopAtLevel=1"
                + " -Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -Duser.language=ko");
        a.get("suspend").setValue("true");
        vm = conn.launch(a);
        Process p = vm.process();
        p.getOutputStream().close();  // 표준입력은 비워 둔다 (Scanner는 바로 EOF)
        vmOut = p.getInputStream();
        vmErr = p.getErrorStream();
        started = System.currentTimeMillis();

        EventRequestManager erm = vm.eventRequestManager();
        ClassPrepareRequest cpr = erm.createClassPrepareRequest();
        cpr.addClassFilter(mainClass);
        cpr.enable();

        Watchdog dog = new Watchdog();
        dog.start();
        EventQueue q = vm.eventQueue();
        ThreadReference mainThread = null;
        boolean done = false;
        while (!done) {
            EventSet set = q.remove(500);
            if (set == null) {
                if (overTime()) { cut = true; break; }
                continue;
            }
            boolean resume = true;
            for (Event ev : set) {
                if (ev instanceof ClassPrepareEvent cpe) {
                    ReferenceType rt = cpe.referenceType();
                    for (Method m : rt.methodsByName("main")) {
                        if (m.isStatic() && m.location() != null) {
                            BreakpointRequest br = erm.createBreakpointRequest(m.location());
                            br.setSuspendPolicy(EventRequest.SUSPEND_EVENT_THREAD);
                            br.enable();
                        }
                    }
                } else if (ev instanceof BreakpointEvent be && mainThread == null) {
                    mainThread = be.thread();
                    erm.deleteEventRequests(erm.breakpointRequests());
                    // JDK 호출은 STEP_OVER로 한 번에 넘기고(단계별로 밟으면 매우 느리다),
                    // 사용자 메서드에 들어가는 순간만 MethodEntry로 잡아 그 안에서 다시 STEP_OVER한다.
                    MethodEntryRequest men = erm.createMethodEntryRequest();
                    men.addThreadFilter(mainThread);
                    for (String x : EXCLUDE) men.addClassExclusionFilter(x);
                    men.setSuspendPolicy(EventRequest.SUSPEND_EVENT_THREAD);
                    men.enable();
                    MethodExitRequest mx = erm.createMethodExitRequest();
                    mx.addThreadFilter(mainThread);
                    for (String x : EXCLUDE) mx.addClassExclusionFilter(x);
                    mx.setSuspendPolicy(EventRequest.SUSPEND_EVENT_THREAD);
                    mx.enable();
                    ExceptionRequest exr = erm.createExceptionRequest(null, false, true);
                    exr.setSuspendPolicy(EventRequest.SUSPEND_EVENT_THREAD);
                    exr.enable();
                    stepOver(erm, mainThread);
                    record(be.thread(), be.location(), "line", null, null);
                } else if (ev instanceof MethodEntryEvent mee) {
                    Method m = mee.method();
                    if (m.isStaticInitializer() || m.isSynthetic() && !m.name().startsWith("lambda$")) continue;
                    record(mee.thread(), mee.location(), "call", null, null);
                    stepOver(erm, mee.thread());
                } else if (ev instanceof StepEvent se) {
                    record(se.thread(), se.location(), "line", null, null);
                } else if (ev instanceof MethodExitEvent me) {
                    if (me.method().isStaticInitializer()) continue;
                    record(me.thread(), me.location(), "return", me.returnValue(), null);
                } else if (ev instanceof ExceptionEvent xe) {
                    ObjectReference ex = xe.exception();
                    String msg = ex.referenceType().name() + exceptionMessage(ex);
                    record(xe.thread(), xe.location(), "exception", null, msg);
                    int line = lineOf(xe.location());
                    error = "{\"kind\":\"runtime\",\"message\":" + Json.str(msg) + ",\"line\":" + line + "}";
                } else if (ev instanceof VMDeathEvent || ev instanceof VMDisconnectEvent) {
                    done = true;
                    resume = false;
                }
            }
            if (steps.size() >= MAX_STEPS || overTime() || out.length() >= MAX_OUT) {
                cut = true;
                break;
            }
            if (resume && !done) set.resume();
        }
        dog.interrupt();
        if (cut) {
            try { vm.exit(1); } catch (Exception ignored) { }
        }
        drain(true);
        try { p.waitFor(2, java.util.concurrent.TimeUnit.SECONDS); } catch (InterruptedException ignored) { }
        p.destroyForcibly();
    }

    /** 스레드당 단계 요청은 하나뿐이므로, 기존 것을 지우고 지금 프레임 기준으로 다시 건다. */
    static void stepOver(EventRequestManager erm, ThreadReference th) {
        erm.deleteEventRequests(erm.stepRequests());
        StepRequest sr = erm.createStepRequest(th, StepRequest.STEP_LINE, StepRequest.STEP_OVER);
        for (String x : EXCLUDE) sr.addClassExclusionFilter(x);
        sr.setSuspendPolicy(EventRequest.SUSPEND_EVENT_THREAD);
        sr.enable();
    }

    boolean overTime() {
        return System.currentTimeMillis() - started > MAX_MILLIS;
    }

    /** 디버기가 끝나지 않고 멈춰 버리는 경우(무한 대기 등)를 끊는다. */
    final class Watchdog extends Thread {
        Watchdog() { setDaemon(true); }
        public void run() {
            try {
                Thread.sleep(MAX_MILLIS + 2000);
                cut = true;
                vm.exit(1);
            } catch (Exception ignored) { }
        }
    }

    static int lineOf(Location l) {
        try { return l.lineNumber(); } catch (Exception e) { return -1; }
    }

    static boolean isUser(ReferenceType t) {
        String n = t.name();
        for (String x : EXCLUDE) if (n.startsWith(x.substring(0, x.length() - 1))) return false;
        return true;
    }

    String exceptionMessage(ObjectReference ex) {
        try {
            Field f = ex.referenceType().fieldByName("detailMessage");
            if (f == null) {
                for (ReferenceType t = ex.referenceType(); t != null; ) {
                    if (t instanceof ClassType ct) {
                        f = ct.fieldByName("detailMessage");
                        if (f != null) break;
                        t = ct.superclass();
                    } else break;
                }
            }
            Value v = f == null ? null : ex.getValue(f);
            return v instanceof StringReference s ? ": " + s.value() : "";
        } catch (Exception e) {
            return "";
        }
    }

    /** 디버기가 쓴 출력을 지금까지 받은 만큼 가져온다. 디버기는 멈춰 있으니 쓴 것은 이미 파이프에 있다. */
    void drain(boolean all) {
        try {
            for (InputStream in : new InputStream[]{vmOut, vmErr}) {
                if (in == null) continue;
                int n;
                while ((n = in.available()) > 0 && out.length() < MAX_OUT) {
                    byte[] buf = in.readNBytes(Math.min(n, MAX_OUT));
                    out.append(new String(buf, StandardCharsets.UTF_8));
                }
            }
            if (all) {
                // 프로세스가 끝났다면 남은 것을 끝까지 읽는다
                if (!vm.process().isAlive()) {
                    out.append(new String(vmOut.readNBytes(Math.max(0, MAX_OUT - out.length())), StandardCharsets.UTF_8));
                    out.append(new String(vmErr.readNBytes(Math.max(0, MAX_OUT - out.length())), StandardCharsets.UTF_8));
                }
            }
        } catch (IOException ignored) { }
    }

    // ── 3. 한 단계 기록 ────────────────────────────────────

    int record(ThreadReference th, Location loc, String event, Value ret, String exception) {
        drain(false);
        List<StackFrame> frames;
        try {
            frames = th.frames();
        } catch (IncompatibleThreadStateException e) {
            return 0;
        }
        Heap heap = new Heap();
        List<String> fs = new ArrayList<>();
        // JDI는 안→바깥 순서. 계약은 바깥→안.
        for (int i = frames.size() - 1; i >= 0; i--) {
            StackFrame f = frames.get(i);
            Location l = f.location();
            if (!isUser(l.declaringType())) continue;
            StringBuilder sb = new StringBuilder();
            Method m = l.method();
            String fn = m.isConstructor() ? "new " + simple(l.declaringType().name()) : m.name();
            sb.append("{\"fn\":").append(Json.str(fn))
              .append(",\"cls\":").append(Json.str(simple(l.declaringType().name())))
              .append(",\"line\":").append(lineOf(l))
              .append(",\"locals\":[");
            boolean first = true;
            try {
                ObjectReference self = f.thisObject();
                if (self != null) {
                    sb.append(var("this", simple(self.referenceType().name()), heap.value(self)));
                    first = false;
                }
                List<LocalVariable> vars = f.visibleVariables();
                Map<LocalVariable, Value> vals = f.getValues(vars);
                for (LocalVariable lv : vars) {
                    if (!first) sb.append(',');
                    first = false;
                    sb.append(var(lv.name(), simple(lv.typeName()), heap.value(vals.get(lv))));
                }
            } catch (AbsentInformationException ignored) {
                // -g 없이 컴파일된 클래스: 지역 변수 정보 없음
            }
            sb.append("]}");
            fs.add(sb.toString());
        }
        heap.expand();
        StringBuilder st = new StringBuilder();
        st.append("{\"line\":").append(lineOf(loc))
          .append(",\"event\":\"").append(event).append('"')
          .append(",\"frames\":[").append(String.join(",", fs)).append(']')
          .append(",\"heap\":").append(heap.json())
          .append(",\"out\":").append(out.length());
        if (ret != null && !(ret instanceof VoidValue)) st.append(",\"ret\":").append(heap.valueOnly(ret));
        if (exception != null) st.append(",\"exception\":").append(Json.str(exception));
        st.append('}');
        steps.add(st.toString());
        return fs.size();
    }

    static String var(String name, String type, String value) {
        return "{\"name\":" + Json.str(name) + ",\"type\":" + Json.str(type) + ",\"value\":" + value + "}";
    }

    static String simple(String type) {
        int lt = type.indexOf('<');
        String base = lt < 0 ? type : type.substring(0, lt);
        int dot = base.lastIndexOf('.');
        String s = dot < 0 ? type : type.substring(dot + 1);
        int dollar = s.lastIndexOf('$');
        return dollar < 0 ? s : s.substring(dollar + 1);
    }

    String result(String err) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"lang\":\"java\",\"steps\":[").append(String.join(",", steps)).append(']')
          .append(",\"stdout\":").append(Json.str(out.toString()))
          .append(",\"cut\":").append(cut);
        if (err != null) sb.append(",\"error\":").append(err);
        sb.append('}');
        return sb.toString();
    }

    static String errorJson(String kind, String msg, int line) {
        return "{\"kind\":\"" + kind + "\",\"message\":" + Json.str(msg) + ",\"line\":" + line + "}";
    }

    // ── 4. 값과 힙 ────────────────────────────────────────

    /** 한 단계에서 프레임이 닿는 객체들. 너비 우선으로 MAX_HEAP개까지 펼친다. */
    static final class Heap {
        final LinkedHashMap<Long, String> done = new LinkedHashMap<>();
        final ArrayDeque<ObjectReference> todo = new ArrayDeque<>();
        final Set<Long> queued = new HashSet<>();

        /** 지역 변수 값. 참조는 힙에 등록하고 {"t":"ref"}를 돌려준다. */
        String value(Value v) {
            if (v instanceof ObjectReference o && !(v instanceof StringReference) && !BOXES.contains(o.referenceType().name())) {
                if (queued.add(o.uniqueID())) todo.add(o);
                return "{\"t\":\"ref\",\"id\":\"" + o.uniqueID() + "\"}";
            }
            return valueOnly(v);
        }

        /**
         * 값이 바뀌지 않는 객체(String, Integer 등 박싱 타입)의 표현을 단계 사이에서 재사용한다.
         * 이 값들을 단계마다 디버기에 다시 물으면 원소 하나당 왕복이 생겨 매우 느려진다.
         */
        static final Map<Long, String> IMMUTABLE = new HashMap<>();

        /** 힙에 등록하지 않고 값만 (반환값 표시용). */
        String valueOnly(Value v) {
            if (v instanceof ObjectReference o && (v instanceof StringReference || BOXES.contains(o.referenceType().name()))) {
                String cached = IMMUTABLE.get(o.uniqueID());
                if (cached != null) return cached;
                String fresh = valueUncached(v);
                if (IMMUTABLE.size() < 100_000) IMMUTABLE.put(o.uniqueID(), fresh);
                return fresh;
            }
            return valueUncached(v);
        }

        String valueUncached(Value v) {
            if (v == null) return "{\"t\":\"null\"}";
            if (v instanceof BooleanValue b) return "{\"t\":\"bool\",\"v\":" + b.value() + "}";
            if (v instanceof CharValue c) return "{\"t\":\"char\",\"v\":" + Json.str(String.valueOf(c.value())) + "}";
            if (v instanceof LongValue l) return num(l.value());
            if (v instanceof IntegerValue || v instanceof ShortValue || v instanceof ByteValue) {
                return "{\"t\":\"num\",\"v\":" + ((PrimitiveValue) v).longValue() + "}";
            }
            if (v instanceof FloatValue || v instanceof DoubleValue) {
                double d = ((PrimitiveValue) v).doubleValue();
                if (Double.isNaN(d) || Double.isInfinite(d)) return "{\"t\":\"num\",\"v\":null,\"text\":\"" + d + "\"}";
                return "{\"t\":\"num\",\"v\":" + d + ",\"float\":true}";
            }
            if (v instanceof StringReference s) {
                String str = s.value();
                if (str.length() > 500) str = str.substring(0, 500) + "…";
                return "{\"t\":\"str\",\"v\":" + Json.str(str) + "}";
            }
            if (v instanceof ObjectReference o) {
                Value b = boxed(o);
                if (b != null) return valueOnly(b);
                return "{\"t\":\"ref\",\"id\":\"" + o.uniqueID() + "\"}";
            }
            return "{\"t\":\"unknown\",\"text\":" + Json.str(String.valueOf(v)) + "}";
        }

        static String num(long l) {
            // 2^53을 넘는 long은 JSON 숫자로 정확히 못 옮기므로 글자로도 보낸다
            if (Math.abs(l) > (1L << 53)) return "{\"t\":\"num\",\"v\":" + l + ",\"text\":\"" + l + "\"}";
            return "{\"t\":\"num\",\"v\":" + l + "}";
        }

        static final Set<String> BOXES = Set.of("java.lang.Integer", "java.lang.Long", "java.lang.Short",
                "java.lang.Byte", "java.lang.Double", "java.lang.Float", "java.lang.Boolean", "java.lang.Character");

        static Value boxed(ObjectReference o) {
            if (!BOXES.contains(o.referenceType().name())) return null;
            Field f = o.referenceType().fieldByName("value");
            return f == null ? null : o.getValue(f);
        }

        void expand() {
            while (!todo.isEmpty() && done.size() < MAX_HEAP) {
                ObjectReference o = todo.poll();
                done.put(o.uniqueID(), describe(o));
            }
        }

        String json() {
            StringBuilder sb = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<Long, String> e : done.entrySet()) {
                if (!first) sb.append(',');
                first = false;
                sb.append('"').append(e.getKey()).append("\":").append(e.getValue());
            }
            return sb.append('}').toString();
        }

        String describe(ObjectReference o) {
            String type = o.referenceType().name();
            String st = simple(type);
            try {
                if (o instanceof ArrayReference arr) {
                    return seq("array", simple(type), arr.length(), arr.getValues(0, Math.min(arr.length(), MAX_ITEMS)));
                }
                switch (type) {
                    case "java.util.ArrayList", "java.util.Vector", "java.util.Stack" -> {
                        int size = intField(o, type.equals("java.util.ArrayList") ? "size" : "elementCount");
                        ArrayReference data = (ArrayReference) field(o, "elementData");
                        int n = Math.min(size, MAX_ITEMS);
                        return seq(type.equals("java.util.Stack") ? "stack" : "list", st, size,
                                n == 0 ? List.of() : data.getValues(0, n));
                    }
                    case "java.util.ArrayDeque" -> {
                        ArrayReference data = (ArrayReference) field(o, "elements");
                        int head = intField(o, "head"), tail = intField(o, "tail"), cap = data.length();
                        List<Value> items = new ArrayList<>();
                        int size = (tail - head + cap) % cap;
                        for (int i = 0; i < size && i < MAX_ITEMS; i++) items.add(data.getValue((head + i) % cap));
                        return seq("deque", st, size, items);
                    }
                    case "java.util.LinkedList" -> {
                        int size = intField(o, "size");
                        List<Value> items = new ArrayList<>();
                        for (ObjectReference n = (ObjectReference) field(o, "first"); n != null && items.size() < MAX_ITEMS;
                             n = (ObjectReference) field(n, "next")) {
                            items.add(field(n, "item"));
                        }
                        return seq("list", st, size, items);
                    }
                    case "java.util.HashMap", "java.util.LinkedHashMap" -> {
                        return map(o, st);
                    }
                    case "java.util.HashSet", "java.util.LinkedHashSet" -> {
                        ObjectReference m = (ObjectReference) field(o, "map");
                        List<Value[]> entries = mapEntries(m);
                        List<Value> keys = new ArrayList<>();
                        for (Value[] e : entries) keys.add(e[0]);
                        return seq("set", st, intField(m, "size"), keys);
                    }
                    default -> { }
                }
                if (!isUser(o.referenceType())) {
                    // 그 밖의 JDK 객체는 내부 구조를 펼치지 않고 형식만 보여준다
                    return "{\"kind\":\"opaque\",\"type\":" + Json.str(st) + "}";
                }
                StringBuilder sb = new StringBuilder("{\"kind\":\"object\",\"type\":").append(Json.str(st)).append(",\"fields\":[");
                boolean first = true;
                List<Field> fields = new ArrayList<>();
                for (Field f : o.referenceType().allFields()) if (!f.isStatic() && !f.isSynthetic()) fields.add(f);
                Map<Field, Value> vals = o.getValues(fields);  // 필드 값을 한 번에 요청
                for (Field f : fields) {
                    if (!first) sb.append(',');
                    first = false;
                    sb.append(var(f.name(), simple(f.typeName()), value(vals.get(f))));
                }
                return sb.append("]}").toString();
            } catch (Exception e) {
                return "{\"kind\":\"opaque\",\"type\":" + Json.str(st) + "}";
            }
        }

        String seq(String kind, String type, int len, List<Value> items) {
            StringBuilder sb = new StringBuilder("{\"kind\":\"").append(kind).append("\",\"type\":").append(Json.str(type))
                    .append(",\"len\":").append(len).append(",\"items\":[");
            for (int i = 0; i < items.size(); i++) {
                if (i > 0) sb.append(',');
                sb.append(value(items.get(i)));
            }
            return sb.append("]}").toString();
        }

        String map(ObjectReference o, String type) {
            List<Value[]> entries = mapEntries(o);
            StringBuilder sb = new StringBuilder("{\"kind\":\"map\",\"type\":").append(Json.str(type))
                    .append(",\"len\":").append(intField(o, "size")).append(",\"entries\":[");
            for (int i = 0; i < entries.size(); i++) {
                if (i > 0) sb.append(',');
                sb.append('[').append(value(entries.get(i)[0])).append(',').append(value(entries.get(i)[1])).append(']');
            }
            return sb.append("]}").toString();
        }

        /** HashMap의 버킷 배열을 순서대로 훑는다. LinkedHashMap은 삽입 순서(head→after). */
        static List<Value[]> mapEntries(ObjectReference m) {
            List<Value[]> out = new ArrayList<>();
            if (m.referenceType().name().equals("java.util.LinkedHashMap")) {
                for (ObjectReference n = (ObjectReference) field(m, "head"); n != null && out.size() < MAX_ITEMS;
                     n = (ObjectReference) field(n, "after")) {
                    out.add(new Value[]{field(n, "key"), field(n, "value")});
                }
                return out;
            }
            ArrayReference table = (ArrayReference) field(m, "table");
            if (table == null) return out;
            for (Value b : table.getValues()) {
                for (ObjectReference n = (ObjectReference) b; n != null && out.size() < MAX_ITEMS;
                     n = (ObjectReference) field(n, "next")) {
                    out.add(new Value[]{field(n, "key"), field(n, "value")});
                }
            }
            return out;
        }

        static Value field(ObjectReference o, String name) {
            for (ReferenceType t = o.referenceType(); t != null; ) {
                Field f = t.fieldByName(name);
                if (f != null) return o.getValue(f);
                if (t instanceof ClassType ct) t = ct.superclass(); else break;
            }
            return null;
        }

        static int intField(ObjectReference o, String name) {
            Value v = field(o, name);
            return v instanceof PrimitiveValue p ? p.intValue() : 0;
        }
    }

    // ── JSON ──────────────────────────────────────────────

    static final class Json {
        static String str(String s) {
            StringBuilder sb = new StringBuilder(s.length() + 2).append('"');
            for (int i = 0; i < s.length(); i++) {
                char c = s.charAt(i);
                switch (c) {
                    case '"' -> sb.append("\\\"");
                    case '\\' -> sb.append("\\\\");
                    case '\n' -> sb.append("\\n");
                    case '\r' -> sb.append("\\r");
                    case '\t' -> sb.append("\\t");
                    default -> {
                        if (c < 0x20 || c == 0x2028 || c == 0x2029) sb.append(String.format("\\u%04x", (int) c));
                        else sb.append(c);
                    }
                }
            }
            return sb.append('"').toString();
        }
    }
}
