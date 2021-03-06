﻿using System;
using System.Collections.Generic;

using Ink;
using Ink.Runtime;

namespace inklecate_wasm {
  public class InklecateWasm {
    public class Options {
      public string inputString;
      public bool verbose;
      public bool playMode;
      public bool countAllVisits;
      public bool keepOpenAfterStoryFinish;
    }

    public static int ExitCodeError = 1;
    public InklecateWasm() {}

    public Story Compile(Options opts) {
      var compiler = new Compiler(opts.inputString, new Compiler.Options{
        pluginNames = pluginNames,
        errorHandler = OnError,
        /* File methods are not (and cannot be) used, so this
         * hopefully won't cause any errors. */
        fileHandler = this as IFileHandler,
      });

      var story = compiler.Compile();

      PrintAllMessages();

      if (story == null || _errors.Count > 0) {
        Console.WriteLine(_errors);
        Environment.Exit(ExitCodeError);
      }

      return story;
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

    List<string> pluginNames = new List<string>();

    List<string> _errors = new List<string>();
    List<string> _warnings = new List<string>();
    List<string> _authorMessages = new List<string>();

    bool _playing;
  }
}
