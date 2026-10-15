import java.util.*;

public class Main {
    static class Node {
        int value;
        Node next;
        Node(int value) { this.value = value; }
    }

    static int fact(int n) {
        if (n <= 1) return 1;
        return n * fact(n - 1);
    }

    public static void main(String[] args) {
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(1); stack.push(2);
        Queue<String> queue = new LinkedList<>();
        queue.offer("a"); queue.offer("b");
        Map<String, Integer> ages = new HashMap<>();
        ages.put("Kim", 25);
        List<Integer> list = new ArrayList<>(List.of(3, 1, 2));
        Node head = new Node(1);
        head.next = new Node(2);
        long big = 9007199254740993L;
        String s = "안녕";
        System.out.println("fact=" + fact(3));
        int[] arr = new int[2];
        arr[5] = 1;
    }
}
