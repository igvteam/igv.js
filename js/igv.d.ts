
// allow extra keys
type ExtraKeys<T> = T & { [key: string]: any };


// TODO: Unworked types for placeholder purposes
type Track = any;
type ColorSpec = any;

type Nucleotide = 'A' | 'C' | 'G' | 'T' | 'N';
type AnnotationFormat = 'bed' | 'gff3' | 'gtf' | 'genePred' | 'genePredExt' | 'peaks' | 'narrowPeak' | 'broadPeak' | 'bigBed' | 'bedpe';

interface GenomeNoRef {
    genome: string;
    reference?: never;
}

interface RefNoGenome {
    reference: ReferenceGenome;
    genome?: never;
}

type GenomeOpt = GenomeNoRef | RefNoGenome;

/**
 * To define or customize a reference genome the reference property can be used.
 */
export interface ReferenceGenome {
    /**
     * UCSC or other id string. Optional
     * 
     * @type {string=}
     */
    id?: string;
    /**
     * A descriptive name. Optional
     * 
     * @type {string=}
     */
    name?: string;
    /**
     * URL to a FASTA file. Required.
     * 
     * @type {string}
     */
    fastaURL: string;
    /**
     * URL to a FASTA index (.fai file). An index file is optional, but if not supplied the entire fasta is read.
     * 
     * @type {string=}
     */
    indexURL?: string;
    /**
     * URL to a cytoband ideogram file in UCSC format. Optional
     * 
     * @type {string=}
     */
    cytobandURL?: string;
    /**
     * URL to a tab-delimited file defining aliases for chromosome names.
     * File should have 1 line per chromosome with all names for the chromosome, separated by tabs, in arbitrary order.
     * See the example below. Optional
     * 
     * @type {string=}
     */
    aliasURL?: string;
    /**
     * Flag indicating if the FASTA is indexed.
     * Ignored if indexURL is supplied.
     * The primary purpose of this property is to indicate that the fasta is not indexed.
     * Deprecated as of Version 3.0
     * 
     * TypeScript users: since this is deprecated and the only useful value is true,
     * only true is allowed in the type definition. 
     * 
     * @type {boolean=}
     */
    indexed?: true;
    /**
     * Release 2.2 
     * An array of chromosome names defining the order in the whole genome view and chromosome pulldown selector, if used.
     * Optional
     * 
     * @type {string[]=}
     */
    chromosomeOrder?: string[];
    /**
     * http headers to include with each request. For example {"authorization": "bearer: token"}. Optional
     * 
     * @type {string=}
     */
    headers?: Record<string, string>;
    /**
     * Construct a "whole genome" view from the individual sequences.
     * This is useful for finished assemblies with a few (< 50) large chromosomes.
     * Its not useful for assemblies with a single or conversely thousands of sequences. Optional
     * 
     * @type {boolean=}
     */
    wholeGenomeView: boolean;
}

interface GenomeFrag {
    /**
     * String identifier defining genome (e.g. "hg19"). See Reference Genome for details and list of supported identifiers. Note: One (but only one) of either genome or reference properties must be set.
     * 
     * @type {string}
     */
    genome: string;
    reference?: never;
}
interface ReferenceFrag {
    /**
     * Object defining reference genome. See Reference Genome for details. Note: One (but only one) of either genome or reference properties must be set.
     * 
     * @type {ReferenceGenome}
     */
    reference: ReferenceGenome;
    genome?: never;
}

interface CreateOptExtras {
    /**
     * 
     * Initial genomic location(s). Either a string or an array of strings. If an array a viewport is created for each location.
     * 
     * @type {string | string[]=}
     */
    locus?: string | string[];

    /**
     * 
     * Color table for nucleotides in sequence an bam tracks. Object with keys "A", "C", "T", "G", and "N"
     * 
     */
    nucleotideColors?: Partial<Record<Nucleotide, ColorSpec>>;

    /**
     * 
     * Array of configuration objects defining tracks initially displayed when app launches.
     * 
     */
    tracks: Track[];
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
