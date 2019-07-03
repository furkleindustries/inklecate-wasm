using System;
using Ink.Runtime;

namespace inklecate_wasm {
    public class Program {
        const string testStr = "->hello_world\n=== hello_world ===\nhello, world!\n->DONE";
        public static void Main(string[] args) {
            CompileToString(testStr);
            Test();
        }

        public static string Test() {
            return Compile(testStr).ToJson();
        }

        public static Story Compile(string inputString) {
            var tool = new InklecateWasm();
            var opts = new InklecateWasm.Options();
            opts.inputString = inputString;
            return tool.Compile(opts);
        }

        public static string CompileToString(string inputString) {
            return Compile(inputString).ToJson();
        }
    }
}
