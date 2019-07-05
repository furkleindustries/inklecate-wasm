using System;
using Ink.Runtime;

namespace inklecate_wasm {
    public static class Program {
        const string testStr = "->hello_world\n=== hello_world ===\nhello, world!\n->DONE";
        public static void Main(string[] args) {
            /* Seems necessary to reference it in WASM? No clue why or what I
             * should be doing instead, so don't change this unless you've got
             * a much better idea than I do! */
            CompileToString(testStr);
        }

        public static Story Compile(string inputString) {
            var tool = new InklecateWasm();
            var opts = new InklecateWasm.Options();
            opts.inputString = inputString;
            return tool.Compile(opts);
        }

        public static string CompileToString(string inputString) {
            string ret = Compile(inputString).ToJson();
            return ret;
        }
    }
}
