// numbers
type RepeatN<S extends string, N extends number, R extends string[] = []> = R['length'] extends N ? "" : `${S}${RepeatN<S, N, [S, ...R]>}`;

type ScanRepeatNS<S extends string, NS extends string, R extends string[] = [], ACC extends string = "", RES extends string[] = []> =
    RepeatN<S, R['length']> extends NS ? RES : ScanRepeatNS<S, NS, [S, ...R], `${ACC}${S}`, [...RES, `${ACC}${S}`]>;

// list
type Tail<T, L extends T[]> = L extends [T, ...infer R] ? R : never;

// arithmetic
type Mul<NS extends string, PS extends string, T extends string = '_', ACC extends string = NS> =
    ACC extends "" ? PS :
    ACC extends `${T}${infer R}` ? Mul<NS, `${NS}${PS}`, T, R> : ACC;

type Sqrt<NS extends string, T extends string = '_', ACC extends string = T> =
    Mul<ACC, ACC, T> extends `${NS}${infer _}` ? ACC : Sqrt<NS, T, `${T}${ACC}`>;

type Divisible<NS extends string, PS extends string> =
    NS extends "" ? true :
    NS extends `${PS}${infer R}` ? Divisible<R, PS> : false;

type DivisibleMany<NS extends string, PS extends string[]> =
    PS extends [infer P extends string, ...infer R extends string[]] ? Divisible<NS, P> extends true ? true : DivisibleMany<NS, R> : false;


// prime
type Sieves<N extends number> = Tail<string, ScanRepeatNS<"_", Sqrt<RepeatN<"_", N>>>>;

type IsPrime<N extends number> = N extends 1 ? never : DivisibleMany<RepeatN<"_", N>, Sieves<N>> extends false ? N : never;

function mustTakePrime<N extends number>(n: IsPrime<N>): void {
    console.log(n, "is prime!");
}

// @ts-expect-error
mustTakePrime(0.1);

// @ts-expect-error
mustTakePrime(1);

mustTakePrime(2);
mustTakePrime(5);

// @ts-expect-error
mustTakePrime(4); // Error
