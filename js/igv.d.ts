
// allow extra keys
type ExtraKeys<T> = T & { [key: string]: any };

declare class Opaque<N extends string> {
    private readonly __opaque_brand: N;
}

export type Track = Tracks.TrackCommonOptions &
    ((Tracks.AnnotationTrackOptions & Tracks.TypeFormatPair<'annotation', Tracks.AnnotationFormat>) |
        (Tracks.WigTrackOptions & Tracks.TypeFormatPair<'wig', Tracks.WigFormat>) |
        (Tracks.WigMergedTrackOptions & { type: 'merged' }) |
        (Tracks.VariantTrackOptions & Tracks.TypeFormatPair<'variant', Tracks.VariantFormat>) |
        (Tracks.SegTrackOptions & Tracks.TypeFormatPair<'seg', Tracks.SegTrackFormat>) |
        (Tracks.CnvPyTorTrackOptions & Tracks.TypeFormatPair<'cnvpytor', Tracks.CnvPyTorFormat>));

export namespace Tracks {
    export interface TypeFormatPair<K extends string, F extends string> {
        type?: K;
        format?: F;
    }

    export interface TrackCommonOptions {
        name: string;
        url: string | Promise<string>;
        indexURL?: string | Promise<string>;
        indexed?: false;
        order?: number;
        color?: string;
        height?: number;
        autoHeight?: boolean;
        minHeight?: number;
        maxHeight?: number;
        visibilityWindow?: number;
        removable?: boolean;
        headers?: Record<string, string>;
        oauthToken?: string | (() => string | Promise<string>);
    }

    export type AnnotationFormat = "bed" | "gff3" | "gtf" | "genePred" | "genePredExt" | "peaks" | "narrowPeak" | "broadPeak" | "bigBed" | "bedpe";

    export type AnnotationTrackDisplay = {
        /**
         * Annotation display mode, one of "COLLAPSED", "EXPANDED", "SQUISHED"
         * 
         * @type {"COLLAPSED" | "EXPANDED" | "SQUISHED"}
         * @default "EXPANDED"
         * 
         */
        displayMode: "EXPANDED",
        /**
         * Height of each row of features in "EXPANDED" mode
         * 
         * @type {number}
         * @default 30
         * 
         */
        expandedRowHeight: number,
    } | {
        /**
         * Annotation display mode, one of "COLLAPSED", "EXPANDED", "SQUISHED"
         * 
         * @type {"COLLAPSED" | "EXPANDED" | "SQUISHED"}
         * @default "EXPANDED"
         * 
         */
        displayMode: "SQUISHED",
        /**
         * Height of each row of features in "EXPANDED" mode
         * 
         * @type {number}
         * @default 15
         * 
         */
        squishedRowHeight: number,
    } | {
        /**
         * Annotation display mode, one of "COLLAPSED", "EXPANDED", "SQUISHED"
         * 
         * @type {"COLLAPSED" | "EXPANDED" | "SQUISHED"}
         * @default "EXPANDED"
         * 
         */
        displayMode?: "COLLAPSED",
    }

    export type AnnotationTrackSearch = {
        /**
         * If true, feature names for this track can be searched for. Use this option with caution, it is memory intensive. This option will not work with indexed tracks.
         * 
         * @type {boolean}
         * @default false
         * 
         */
        searchable: true,
        /**
         * For use with the searchable option in conjunction with GFF files. An array of field (column 9) names to be included in feature searches. When searching for feature attributes spaces need to be escaped with a "+" sign or percent encoded ("%20).
         * 
         * @type {string[]}
         * 
         */
        searchableFields: string[],
    } | {
        /**
         * If true, feature names for this track can be searched for. Use this option with caution, it is memory intensive. This option will not work with indexed tracks.
         * 
         * @type {boolean}
         * @default false
         * 
         */
        searchable?: false,
    }

    interface AnnotationTrackCommonOptions {
        /**
         * For GFF/GTF file formats. Name of column 9 property to be used for feature label.
         * 
         * @type {string}
         */
        nameField?: string;
        /**
         * Maximum number of rows of features to display
         * 
         * @type {number}
         * @default 500
         */
        maxRows?: number;
        /**
         * Array of gff feature types to filter from display.
         * 
         * @type {string[]}
         * @default ["chromosome", "gene"]
         */
        filterTypes?: string[];
        /**
         * CSS color value for track features, e.g. "#ff0000" or "rgb(100,0,100)".
         * 
         * @type {string}
         * @default "rgb(0,0,150)"
         */
        color?: string,
        /**
         * If supplied, used for features on negative strand
         * 
         * @type {string}
         * @default "rgb(100,100,100)"
         */
        altColor?: string,
        /**
         * Used with GFF/GTF files. Name of column 9 attribute to color features by.
         * 
         * @type {string}
         * 
         */
        colorBy?: string,
        /**
         * Used in conjunction with colorBy property. Maps attribute values to CSS colors. See example below.
         * 
         * @type {Record<string, string>}
         * 
         */
        colorTable?: Record<string, string>,
    }

    export type AnnotationTrackOptions = ExtraKeys<AnnotationTrackDisplay & AnnotationTrackSearch & AnnotationTrackCommonOptions>;

    export type WigFormat = "wig" | "bigWig";

    export interface WigTrackCommonOptions {
        /**
         * Autoscale track to maximum value in view
         * 
         * @type {boolean}
         */
        autoscale?: boolean;
        /**
         * Identifier for an autoscale group. Tracks with the same identifier are autoscaled together.
         * 
         * @type {string}
         */
        autoscaleGroup?: string;
        /**
         * Sets the minimum value for the data (y-axis) scale. Usually zero.
         * 
         * @type {number}
         */
        min?: number;
        /**
         * Sets the maximum value for the data (y-axis) scale. This value is ignored if autoscale = true
         * 
         * @type {number}
         */
        max?: number;
        /**
         * Track color as as an "rgb(,,,)" string, a hex string, or css color name. Alternatively a function can be supplied which takes value as a parameter and returns a color.
         * 
         * @type {string}
         */
        color?: string,
        /**
         * If supplied, used for negative values. See description of color field above.
         * 
         * @type {string}
         */
        altColor?: string,
        /**
         * Draws a horizontal line for each object in the given array: 
         * guideLines: [ {color: [color], y: [number], dotted: [bool]} ] 
         * 
         * Note: y value should be between min and max or it will not show.
         * 
         * @type {object}
         */
        guidelines?: Array<{ color: string, y: number, dotted: boolean }>;
        /**
         * Type of graph, either "bar" or "points"
         * 
         * @type {"points" | "bar"}
         * @default "points"
         */
        graphType?: "points" | "bar";
        /**
         * If true, track is drawn "upside down" with zero at top
         * 
         * @type {boolean}
         * @default false
         */
        flipAxis?: boolean;
        /**
         * Applicable to tracks created from bigwig and tdf files.
         * Governs how data is summarized when zooming out.
         * Options include min, max, and mean.
         * 
         * @type {"mean" | "max" | "min"}
         * @default "mean"
         */
        windowFunction?: "mean" | "max" | "min";
    }

    export type WigTrackOptions = ExtraKeys<WigTrackCommonOptions>;

    export type WigMergedTrackOptions = ExtraKeys<{
        tracks: (TypeFormatPair<'wig', WigFormat> & WigTrackOptions)[];
    }>;

    export type VariantFormat = "vcf";

    export type VariantTrackOptions = ExtraKeys<{
        displayMode?: "EXPANDED" | "SQUISHED" | "COLLAPSED";
        squishedCallHeight?: number;
        expandedCallHeight?: number;
        color?: string | ((variant: Record<string, string>) => string);
        colorBy?: string;
        colorTable?: Record<string, string>;
        noCallColor?: string;
        homvarColor?: string;
        hetvarColor?: string;
        homrefColor?: string;
    }>;

    export type SegTrackFormat = "seg";

    export type SegTrackOptions = {
        isLog?: boolean;
        displayMode?: "EXPANDED" | "SQUISHED" | "FILL";
        sort?: ({
            position: number
        } | {
            start: number,
            end: number
        }) & {
            direction?: "ASC" | "DESC"
            chr: string
        }
    }

    export type CnvPyTorFormat = "pytor" | "vcf";

    export type CnvPyTorTrackOptions = {
        signal_name?: string;
        cnv_caller?: "ReadDepth" | "2D";
        bin_size?: number;
        colors?: string[];
    }

}

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
     * 
     * @deprecated
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
    nucleotideColors?: Partial<Record<Nucleotide, string>>;

    /**
     * 
     * Array of configuration objects defining tracks initially displayed when app launches.
     * 
     */
    tracks: Track[];
}

export type CreateOpt = GenomeOpt & CreateOptExtras;

declare class ROISet {
    url: string;
    name: string;
    isUserDefined: boolean;
    color: string;
    headerColor: string;
    isvisible: boolean;
}

interface DefineROI {
    url: string;
    name: string;
    format: string;
    color: string;
}

declare class _Browser {
    currentLoci(): string[] | string;
    loadGenome(genome: string | ReferenceGenome): Promise<void>;
    loadSessionObject(session: Opaque<'igv.js session JSON'>): void;
    loadSession(session: string): void;
    // TODO: check the return type
    loadTrack(track: Track): Promise<any>;
    loadSampleInfo({ url: string }): void;
    findTracks(func: (track: Track) => boolean): Track[];
    findTracks(property: string, value: any): Track[];
    removeTRack(track: Track): void;
    removeTrackByName(trackName: string): void;
    loadROI(roi: DefineROI | DefineROI[]): void;
    clearROIs(): void;
    getUserDefinedROIs(): Promise<ROISet>;
    search(query: string): void;
    zoomIn(): void;
    zoomOut(): void;
    visibilityChange(): void;
    toJSON(): Opaque<'igv.js session JSON'>;
    compressedSession(): string;
    toSVG(): string;
    setCustomCursorGuideMouseHandler(handler: (state: {
        bp: number,
        start: number,
        end: number,
        interpolant: number,
    }) => void): void;
}

export type Browser = _Browser;

type CreateBrowser = (div: HTMLElement, options: CreateOpt) => Promise<Browser>;

export type IGV = {
    createBrowser: CreateBrowser;
}

declare const igv: IGV;

export default igv;
