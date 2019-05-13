export class Module {
  public static readonly FS_createPath: (
    parent: string,
    path: string,
    canRead: boolean,
    canWrite: boolean,
  ) => void;

  public static readonly FS_createDataFile: (
    parent: string,
    name: string | null,
    data: any,
    canRead: boolean,
    canWrite: boolean,
    canOwn: boolean,
  ) => void;

  public static readonly cwrap: (
    ident: string,
    returnType: string | null,
    argTypes: string[],
  ) => void;

  public static readonly UTF8ToString: (monoObj: any) => any;

  public static readonly _malloc: (size: number) => number;

  public static readonly _free: (raw: any) => void;

  public static readonly getValue: (pointer: number, type: string) => any;

  public static readonly setValue: (
    pointer: number,
    value: any,
    type: string,
  ) => void;
}

export class MonoRuntime {}
