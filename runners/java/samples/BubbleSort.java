public class Main {
    public static void main(String[] args) {
        int[] data = {5, 2, 9, 1, 7};
        for (int i = 0; i < data.length - 1; i++) {
            for (int j = 0; j < data.length - 1 - i; j++) {
                if (data[j] > data[j + 1]) {
                    int tmp = data[j];
                    data[j] = data[j + 1];
                    data[j + 1] = tmp;
                }
            }
        }
        System.out.println(java.util.Arrays.toString(data));
    }
}
