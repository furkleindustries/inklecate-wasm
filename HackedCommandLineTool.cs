using System;
using System.Collections.Generic;
using System.IO;

using Ink;
using Ink.Runtime;

namespace inklecate_wasm {
    public class HackedCommandLineTool {
        class Options {
            public string inputString;
            public bool verbose;
            public bool playMode;
            public bool countAllVisits;
            public bool keepOpenAfterStoryFinish;
        }

        public static int ExitCodeError = 1;

        HackedCommandLineTool(Options opts) {
            Story story;
            Compiler compiler = null;

            if (opts.playMode) {
                compiler = new Compiler(opts.inputString, new Compiler.Options{
                    sourceFilename = "inklecate-wasm",
                    pluginNames = pluginNames,
                    countAllVisits = opts.countAllVisits,
                    errorHandler = OnError,
                    fileHandler = this as Ink.IFileHandler,
                });

                story = compiler.Compile();
            } else {
                story = new Story(opts.inputString);
            }

            PrintAllMessages();

            if (story == null || _errors.Count > 0) {
                Environment.Exit(ExitCodeError);
            }

            // Play mode
            if (opts.playMode) {
                _playing = true;

                // Always allow ink external fallbacks
                story.allowExternalFunctionFallbacks = true;

                var player = new HackedCommandLinePlayer(story, false, compiler, opts.keepOpenAfterStoryFinish);

                // Capture a CTRL+C key combo so we can restore the console's foreground color back to normal when exiting
                Console.CancelKeyPress += OnExit;

                try {
                    player.Begin();
                } catch (StoryException e) {
                    if (e.Message.Contains("Missing function binding")) {
                        OnError(e.Message, ErrorType.Error);
                        PrintAllMessages();
                    } else {
                        throw e;
                    }
                } catch (Exception e) {
                    var storyPath = "<END>";
                    var path = story.state.currentPathString;
                    if (path != null) {
                        storyPath = path.ToString();
                    }

                    throw new Exception(e.Message + " (Internal story path: " + storyPath + ")", e);
                }
            }
            // Compile mode
            else {
                var jsonStr = story.ToJsonString();
                try {
                    // File.WriteAllText(opts.outputFile, jsonStr, System.Text.Encoding.UTF8);
                    // TODO: ADD OUTPUT
                }
                catch {
                    // Console.WriteLine("Could not write to output file '" + opts.outputFile + "'");
                    Environment.Exit(ExitCodeError);
                }
            }
        }

        private void OnExit(object sender, ConsoleCancelEventArgs e) {
            Console.ResetColor();
        }

        void OnError(string message, ErrorType errorType) {
            switch (errorType) {
                case ErrorType.Author:
                    _authorMessages.Add(message);
                    break;

                case ErrorType.Warning:
                    _warnings.Add(message);
                    break;

                case ErrorType.Error:
                    _errors.Add(message);
                    break;
            }

            // If you get an error while playing, just print immediately
            if (_playing) {
                PrintAllMessages();
            }
        }

        void PrintMessages(List<string> messageList, ConsoleColor colour)  {
            Console.ForegroundColor = colour;

            foreach (string msg in messageList) {
                Console.WriteLine(msg);
            }

            Console.ResetColor();
        }

        void PrintAllMessages() {
            PrintMessages(_authorMessages, ConsoleColor.Green);
            PrintMessages(_warnings, ConsoleColor.Blue);
            PrintMessages(_errors, ConsoleColor.Red);

            _authorMessages.Clear();
            _warnings.Clear();
            _errors.Clear();
        }

        Options opts;
        List<string> pluginNames;

        List<string> _errors = new List<string>();
        List<string> _warnings = new List<string>();
        List<string> _authorMessages = new List<string>();

        bool _playing;
    }
}
