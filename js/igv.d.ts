
// allow extra keys
type ExtraKeys<T> = T & { [key: string]: any };

interface GenomeNoRef {
    genome: string;
    reference?: never;
}

interface RefNoGenome {
    reference: ReferenceGenome;
    genome?: never;
}

type GenomeOpt = GenomeNoRef | RefNoGenome;

export interface ReferenceGenome {
    id?: string;
    name?: string;
    fastaURL: string;
    indexURL?: string;
    cytobandURL?: string;
    headers?: Map<string, string>;
}

interface GenomeFrag {
    genome: string;
    reference?: never;
}
interface ReferenceFrag {
    reference: ReferenceGenome;
    genome?: never;
}

interface CreateOptExtras {
    locus?: string | string[];
}

export type CreateOpt = GenomeOpt & CreateOptExtras;

declare class _Browser {
    toSVG(): string;
}

export type Browser = _Browser;

type CreateBrowser = (div: HTMLElement, options: CreateOpt) => Promise<Browser>;

export type IGV = {
    createBrowser: CreateBrowser;
}

declare const igv: IGV;

export default igv;
