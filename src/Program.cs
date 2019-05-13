using System;

namespace inklecate_wasm {
    public class Program {
        public static void Main(string[] args) {
        }
        public static void Test() {
            var opts = new InklecateWasm.Options();
            opts.inputString = "Hello, world!";
            var tool = new InklecateWasm(opts);
        }
    }
}
