// either uppercase or lowercase
type AnyCase<T extends string> = Uppercase<T> | Lowercase<T>;

// any action that can be deferred as a promise
type Deferrable<T> = T | Promise<T> | (() => T | Promise<T>);

// simply prevents the type from being inferred
declare class Opaque<N extends string> {
    private readonly __opaque_brand: N;
}

export type TrackType =
    "annotation" | "wig" | "alignment" | "variant" | "mut" | "seg" |
    "gwas" | "interact" | 'interaction' | "qtl" | "junction" | "cnvpytor" | "merged" | "arc" |
    /* undocumented options */
    "snp" | "eqtl";

// converts a track type into the options needed to create it
export type TrackLoad<T extends TrackType> =
    Tracks.TrackCommonOptions &
    (T extends "annotation" ? Tracks.AnnotationTrackOptions & TypeFormatPair<'annotation'> :
        T extends "wig" ? Tracks.WigTrackOptions & TypeFormatPair<'wig'> :
            T extends "alignment" ? Tracks.AlignmentTrackOptions & TypeFormatPair<'alignment'> :
                T extends "variant" ? Tracks.VariantTrackOptions & TypeFormatPair<'variant'> :
                    T extends "mut" ? Tracks.MutationTrackOptions & TypeFormatPair<'mut'> :
                        T extends "seg" ? Tracks.SegTrackOptions & TypeFormatPair<'seg'> :
                            T extends "gwas" ? Tracks.GWASTrackOptions<Tracks.GWASFormat> & TypeFormatPair<'gwas'> :
                                T extends "interact" | "interaction" ? Tracks.InteractTrackOptions & TypeFormatPair<'interact' | 'interaction'> :
                                    T extends "qtl" ? Tracks.QTLTrackOptions & TypeFormatPair<'qtl'> :
                                        T extends "junction" ? Tracks.JunctionTrackOptions & TypeFormatPair<'junction'> :
                                            T extends "cnvpytor" ? Tracks.CnvPyTorTrackOptions & TypeFormatPair<'cnvpytor'> :
                                                T extends "merged" ? Tracks.WigMergedTrackOptions & { type: 'merged' } :
                                                    T extends "arc" ? Tracks.ArcTrackOptions & TypeFormatPair<'arc'> :
                                                        /* undocumented options */
                                                        T extends "snp" ? Tracks.SNPTrackOptions & TypeFormatPair<'snp'> :
                                                            T extends "eqtl" ? Tracks.EQTLTrackOptions & TypeFormatPair<'eqtl'> :
                                                                never);

export type TypeFormatPair<T extends TrackType> = {
    type?: T;
    // if we know the format, type is not required
    format: TrackFormatOf<T>;
    // in this case URL can be anything
    url: Deferrable<string>;
} | ({
    // an explicit type and manual reader is allowed, however format and url will not make sense in this context
    type: T;
    format?: never;
    url?: never;
} & (CustomReaderOf<T> | FeatureOf<T>));

// converts a track type into the file formats that it can accept
export type TrackFormatOf<T extends TrackType> =
    T extends "annotation" ? Tracks.AnnotationFormat :
        T extends "wig" ? Tracks.WigFormat :
            T extends "alignment" ? Tracks.AlignmentFormat :
                T extends "variant" ? Tracks.VariantFormat :
                    T extends "mut" ? Tracks.MutationFormat :
                        T extends "seg" ? Tracks.SegFormat :
                            T extends "gwas" ? Tracks.GWASFormat :
                                T extends "interact" | 'interaction' ? Tracks.InteractFormat :
                                    T extends "qtl" ? Tracks.QTLFormat :
                                        T extends "junction" ? Tracks.JunctionFormat :
                                            T extends "cnvpytor" ? Tracks.CnvPyTorFormat :
                                                T extends "arc" ? Tracks.ArcFormat :
                                                    /* undocumented options */
                                                    T extends "snp" ? Tracks.SNPFormat :
                                                        T extends "eqtl" ? Tracks.EQTLFormat :
                                                            never;

// converts a track type into the manual features that it can accept
export type FeatureOf<T extends TrackType> =
    T extends "annotation" ? {
            features: Record<string, any>[];
        } :
        T extends "wig" ? {
                features: Tracks.WigTrackFeatures;
            } :
            T extends "seg" ? {
                features: {
                    chr: string;
                    start: number;
                    end: number;
                    value: number;
                    sample: string;
                }[];
            } : never;

// some tracks can support a custom reader that polls data based on options
export type CustomReaderOf<T extends TrackType> =
    T extends "annotation" ? { reader: Tracks.AnnotationCustomReader } |
        {
            source: {
                url: string;
                method?: "GET" | "POST";
                contentType?: string;
                body?: string;
            }
        } :
        T extends "seg" ? {
                source: {
                    url: (options: { chr: string }) => string;
                    method?: "GET" | "POST";
                    contentType?: string;
                    body?: string;
                    mappings: Record<string, string>;
                }
            } :
            never;

// converts a track type into the actual track class
export type TrackOf<T extends TrackType> =
    T extends "annotation" ? Tracks.Track :
        T extends "wig" ? Tracks.Track :
            T extends "alignment" ? Tracks.AlignmentTrack :
                T extends "variant" ? Tracks.Track :
                    T extends "mut" ? Tracks.Track :
                        T extends "seg" ? Tracks.Track :
                            T extends "gwas" ? Tracks.Track :
                                T extends "interact" | 'interaction' ? Tracks.Track :
                                    T extends "qtl" ? Tracks.Track :
                                        T extends "junction" ? Tracks.Track :
                                            T extends "cnvpytor" ? Tracks.Track :
                                                T extends "merged" ? Tracks.Track :
                                                    T extends "arc" ? Tracks.Track :
                                                        /* undocumented options */
                                                        T extends "snp" ? Tracks.Track :
                                                            T extends "eqtl" ? Tracks.Track :
                                                                never;


export type StaticFeatureConfig<T extends Record<string, any>> = {
    url(options: T): string;
    method?: "GET" | "POST";
    contentType?: string;
    body?: string;
    mappings: Record<keyof T, string>;
}


export namespace Tracks {
    export class Track {
        public readonly id: string;
        public readonly type: string;
        public readonly name?: string;
    }


    export interface TrackCommonOptions {
        name?: string;
        indexURL?: string | Promise<string>;
        indexed?: false;
        order?: number;
        height?: number;
        autoHeight?: boolean;
        minHeight?: number;
        maxHeight?: number;
        visibilityWindow?: number | string;
        removable?: boolean;
        headers?: Record<string, string>;
        oauthToken?: string | (() => string | Promise<string>);
        sourceType?: string;
        filename?: string;
        roi?: DefineROI[];
    }

    export class AnnotationCustomReader {
        constructor(config: TrackCommonOptions & AnnotationTrackOptions);
        readFeatures(chr: string, start: number, end: number): Promise<Record<string, any>[]>;
    }

    export type AnnotationFormat = "bed" | "gff3" | "gtf" |
        "genePred" | "genePredExt" | "peaks" |
        "narrowPeak" | "broadPeak" | "bigBed" | "bedpe" | "rmsk" | "vcf" |
        "gtexgwas";

    export type AnnotationTrackDisplay = {
        displayMode: AnyCase<"EXPANDED">
        expandedRowHeight?: number,
    } | {
        displayMode: AnyCase<"SQUISHED">
        squishedRowHeight: number,
    } | {
        displayMode?: AnyCase<"COLLAPSED">
    }

    export type AnnotationTrackSearch = {
        searchable: true,
        searchableFields: string[],
    } | {
        searchable?: false,
    }

    export interface AnnotationTrackCommonOptions {
        nameField?: string;
        maxRows?: number;
        filterTypes?: string[];
        color?: string | ((feature: {
            chr: string;
            getAttributeValue: (name: string) => string;
        }) => string);
        colorBy?: string;
        altColor?: string, rBy?: string,
        colorTable?: Record<string, string>,
    }

    export type AnnotationTrackOptions = AnnotationTrackDisplay & AnnotationTrackSearch & AnnotationTrackCommonOptions;

    export type WigFormat = AnyCase<"wig"> | "bigWig" | AnyCase<'bigWig'> | AnyCase<'tdf'> | AnyCase<'bw'>;

    export interface WigTrackOptions {
        autoscale?: boolean;
        autoscaleGroup?: string;
        min?: number;
        max?: number;
        color?: string,
        altColor?: string,
        guidelines?: { color: string, y: number, dotted: boolean }[];
        graphType?: "points" | "bar";
        flipAxis?: boolean;
        windowFunction?: "mean" | "max" | "min";

        height?: number;

        displayMode?: AnyCase<"EXPANDED" | "SQUISHED" | "COLLAPSED">;
    }

    export type WigTrackFeatures = {
        chr: string;
        start: number;
        end: number;
        value: number;
    }[];

    export type WigMergedTrackOptions = {
        tracks: (Partial<TrackCommonOptions> & ((TypeFormatPair<'wig'> & WigTrackOptions) | (TypeFormatPair<'junction'> & JunctionTrackOptions)))[];
    };

    export type VariantFormat = "vcf";

    export type VCFItem = {
        chrom: string;
        pos: number;
        id: string;
        ref: string;
        alt: string;
        qual: number;
        filter: string;
        info: Record<string, string>;
    }

    export type VariantTrackOptions = {
        displayMode?: AnyCase<"EXPANDED" | "SQUISHED" | "COLLAPSED">;
        squishedCallHeight?: number;
        expandedCallHeight?: number;
        color?: string | ((variant: VCFItem) => string);
        colorBy?: string;
        colorTable?: Record<string, string>;
        noCallColor?: string;
        homvarColor?: string;
        hetvarColor?: string;
        homrefColor?: string;
        supportsWholeGenome?: boolean;
        showGenotypes?: boolean;
        strokecolor?: (variant: VCFItem) => string | void;
        context_hook?: unknown;
    };

    export type CnvPyTorFormat = "pytor" | "vcf";

    export type CnvPyTorTrackOptions = {
        signal_name?: string;
        cnv_caller?: "ReadDepth" | "2D";
        bin_size?: number;
        colors?: string[];
    }

    export type AlignmentFormat = "bam" | "cram";

    type AlignmentBy = (string & {}) // tag:tagName and base:position

    export type AlignmentSortOptions = {
        chr: string;
        position: number;
        direction?: "ASC" | "DESC";
    } & ({
        option: "BASE" | "STRAND" | "INSERT_SIZE" | "MATR_CHR" | "MQ";
    } | {
        option: "TAG";
        tag: string;
    });

    export type AlignmentTrackOptions = {
        showCoverage?: boolean;
        showAlignments?: boolean;
        viewAsPairs?: boolean;
        pairsSupported?: boolean;
        coverageColor?: string;
        color?: string;
        deletionColor?: string;
        displayMode?: AnyCase<"FULL" | "EXPANDED" | "SQUISHED">;
        groupBy?:
            "strand" | "firstOfPairStrand" | "pairOrientation" | "mateChr" | "chimeric" | "supplementary" | "readOrder" | AlignmentBy;
        samplingWindowSize?: number;
        samplingDepth?: number;
        readGroup?: string;
        sort?: AlignmentSortOptions;
        filter?: {
            vendorFailed?: boolean;
            duplicates?: boolean;
            secondary?: boolean;
            supplementary?: boolean;
            mq?: number;
            readGroups?: string[];
        };
        showSoftClips?: boolean;
        showMismatches?: boolean;
        showAllBases?: boolean;
        showInsertionText?: boolean;
        insertionTextColor?: string;
        alignmentRowHeight?: number;
        squishedRowHeight?: number;
    } & (
        {
            colorBy: "strand" | "firstOfPairStrand";
            insertionColor?: string;
            negStrandColor?: string;
        } |
        {
            colorBy: "pairOrientation" | "tlen"
                | "unexpectedPair"
                | "basemod" | "basemod2"
                | AlignmentBy;
        } |
        {
            colorBy?: "fragmentLength";
        });


    class AlignmentTrack extends Track {
        setHighlightedReads(readNames: string[], color: string): void;
        sort(options: AlignmentSortOptions): void;
    }

    export type GWASFormat = "gwas" | "bed";

    export type GWASTrackOptions<F extends GWASFormat> = {
        min?: number;
        max?: number;
        posteriorProbability?: boolean;
        dotSize?: number;
        colorTable?: Record<string, string>;
        columns?: F extends "gwas" ? {
            chromosome: number;
            position: number;
            value: number;
        } : never;
    }

    export type MutationFormat = "maf" | "mut";

    export type MutationTrackOptions = {
        displayMode?: AnyCase<"EXPANDED" | "SQUISHED" | "COLLAPSED">;
    }

    export type SegFormat = "seg";

    export type SegTrackOptions = {
        displayMode?: AnyCase<"EXPANDED" | "SQUISHED" | "FILL">;
        sort?: ({
            option: "value" | "VALUE";
        } | {
            option: "attribute" | "ATTRIBUTE";
            attribute: string;
        });
        samples?: string[];
    } & (
        {
            isLog?: boolean;
            log?: never;
        } | {
        log?: boolean;
        isLog?: never;
    });


    export type InteractFormat = "interact" | "bedpe" | "bigInteract" | "bb";

    export type InteractTrackOptions = {
        arcType?: "nested" | "proportional" | "inView" | "partialInView";
        arcOrientation?: "UP" | "DOWN" | boolean;
        color?: string;
        alpha?: number | string;
        logScale?: boolean;
        showBlocks?: boolean;
        thickness?: number;
        useScore?: boolean;
        max?: number;
    }

    export type QTLFormat = "qtl";

    export type QTLTrackOptions = {
        min?: number;
        max?: number;
        autoscalePercentile?: number;
    }

    export type JunctionFormat = "bed";

    export type JunctionTrackFilteringOptions = {
        minUniquelyMappedReads?: number;
        minTotalReads?: number;
        maxFractionMultiMappedReads?: number;
        minSplicedAlignmentOverhang?: number;
        hideStrand?: "+" | "-";
        hideAnnotatedJunctions?: boolean;
        hideUnannotatedJunctions?: boolean;
        hideMotifs?: string[];
    }

    export type JunctionTrackOptions = ({
        colorBy?: "numUniqueReads" | "numReads";
        colorByNumReadsThreshold: number;
    } | {
        colorBy: "isAnnotatedJunction" | "strand" | "motif";
        colorByNumReadsThreshold?: never;
    }) & {
        displayMode?: AnyCase<"COLLAPSED" | "EXPANDED" | "SQUISHED">;
        thicknessBasedOn?: "numUniqueReads" | "numReads" | "isAnnotatedJunction";
        bounceHeightBasedOn?: "random" | "distance" | "thickness";
        labelUniqueReadCount?: boolean;
        labelMultiMappedReadCount?: boolean;
        labelTotalReadCount?: boolean;
        labelMotif?: boolean;
        // TODO: documented but not implemented?
        // labelAnnotatedJunction?: string | null;
        minSplicedAlignmentOverhang?: number;
    } & JunctionTrackFilteringOptions;

    export type ArcFormat = "bp";

    export type ArcTrackOptions = {
        arcOrientation?: "UP" | "DOWN";
    }

    // TODO: undocumented
    export type SNPFormat = "snp";

    export interface SNPTrackOptions {
    }

    export type EQTLFormat = "eqtl";

    export interface EQTLTrackOptions {
        sourceType: "gtex-ws";
        tissueSiteDetailId: string;
    }
}

type Nucleotide = 'A' | 'C' | 'G' | 'T' | 'N';

type SuggestedGenomeIDs = "hs1" | "chm13v1.1" | "hg38" | "hg38_1kg" | "hg19" |
    "hg18" | "mm39" | "mm10" | "mm9" | "rn7" |
    "rn6" | "gorGor6" | "gorGor4" | "panTro6" | "panTro5" |
    "panTro4" | "macFas5" | "GCA_011100615.1" | "panPan2" | "canFam3" |
    "canFam4" | "canFam5" | "bosTau9" | "bosTau8" | "susScr11" |
    "galGal6" | "danRer11" | "danRer10" | "ce11" |
    "dm6" | "dm3" | "dmel_r5.9" | "sacCer3" | "ASM294v2" |
    "ASM985889v3" | "tair10"

export type GenomeDef = SuggestedGenomeIDs | (string & {}) | ReferenceGenome;

export type GenomeOpt = { reference: GenomeDef, genome?: never } | { genome: GenomeDef, reference?: never };

/**
 * To define or customize a reference genome the reference property can be used.
 */
export interface ReferenceGenome {
    id?: string;
    name?: string;
    fastaURL: string;
    indexURL?: string;
    cytobandURL?: string;
    aliasURL?: string;
    /**
     * @deprecated
     */
    indexed?: true;
    chromosomeOrder?: string[];
    headers?: Record<string, string>;
    wholeGenomeView?: boolean;
}

interface CreateOptExtras {
    supportQueryParameters?: boolean;
    queryParametersSupported?: boolean;

    showNavigation?: boolean;

    showSampleNames?: boolean;
    sampleNameViewportWidth?: number;
    locus?: string | string[];
    nucleotideColors?: Partial<Record<Nucleotide, string>>;

    roi?: DefineROI[];
    tracks?: TrackLoad<TrackType>[];

    search?: {
        url: string;
        chromosomeField: string;
        displayName: string;
    };
}

export namespace BrowserEvents {
    export type EventType = "trackremoved" | "trackdrag" | "trackdragend" | "locuschange" | "trackclick" | "trackorderchanged";

    // returns the type of the event handler based on the event type
    export type EventHandler<T extends EventType> =
        T extends "trackremoved" ? (tracks: Tracks.Track[]) => EventReturn<T> :
            T extends "locusChange" ? (loci: {
                    chr: string;
                    start: number;
                    end: number;
                    getLocusString: () => string;
                }[]) => EventReturn<T> :
                T extends "trackclick" ? (
                        track: Tracks.Track,
                        popoverData?: Record<string, string>,
                        genomicLocation?: number
                    ) => EventReturn<T> :
                    T extends "trackorderchanged" ? (trackNames: string[]) => EventReturn<T> :
                        (payload: any) => EventReturn<T>;

    export type EventReturn<T extends EventType> =
        T extends "trackclick" ? string | boolean | undefined :
            void;
}

export type CreateOpt = (GenomeOpt & CreateOptExtras) | (
    // if a session URL is provided, we do not need a complete definition, additionally we should not allow a different genome
    {
        sessionURL: string;
    } & Partial<CreateOptExtras>
    )

export interface ROISet {
    url: string;
    name: string;
    indexed: boolean;
    isUserDefined: boolean;
    color: string;
    headerColor: string;
    isvisible: boolean;
    chr: string;
    start: number;
    end: number;
}

export type DefineROI = {
    name?: string;
    color: string;
} & ({
    url: string;
    indexed?: boolean;
    format?: string;
} | {
    features: {
        chr: string;
        start: number;
        end: number;
    }[]
});


declare class _Browser {
    currentLoci(): string[] | string;
    loadGenome(genome: string | ReferenceGenome): Promise<void>;
    loadSessionObject(session: Opaque<'igv.js session JSON'>): void;
    loadSession(session: string): void;
    loadTrack<T extends TrackType>(track: TrackLoad<T>): Promise<TrackOf<T>>;
    loadSampleInfo({ url: string }): void;
    findTracks(func: (track: Tracks.Track) => boolean): Tracks.Track[];
    findTracks(property: string, value: any): Tracks.Track[];
    removeTrack(track: Tracks.Track): void;
    removeTrackByName(trackName: string): void;
    loadROI(roi: DefineROI | DefineROI[]): void;
    clearROIs(): void;
    getUserDefinedROIs(): Promise<ROISet[]>;
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

    sessionURL(): string;

    on<T extends BrowserEvents.EventType>(event: T, handler: BrowserEvents.EventHandler<T>): void;
    off(event: BrowserEvents.EventType): void;
}

export type Browser = _Browser;

type CreateBrowser = (div: HTMLElement, options: CreateOpt) => Promise<Browser>;

export type GlobalConfig = {
    minimumBases: number;
    showIdeogram: boolean;
    showCircularView: boolean;
    showCircularViewButton: boolean;
    showTrackLabelButton: boolean;
    showTrackLabels: boolean;
    doShowROITableButton: boolean;
    showROITable: boolean;
    showCursorTrackingGuideButton: boolean;
    showCursorTrackingGuide: boolean;
    showCenterGuideButton: boolean;
    showCenterGuide: boolean;
    showSampleNames: boolean;
    showSVGButton: boolean;
    showControls: boolean;
    showNavigation: boolean;
    showRuler: boolean;
    flanking: number;
    pairsSupported: boolean;
    tracks: TrackLoad<TrackType>[];
}


export type IGV = {
    readonly setDefaults: (config: Partial<GlobalConfig>) => void;
    /**
     * Create an igv.browser instance.  This object defines the public API for interacting with the genome browser.
     *
     * @param parentDiv - DOM tree root
     * @param config - configuration options.
     *
     */
    readonly createBrowser: CreateBrowser;
    readonly removeBrowser: (browser: Browser) => void;
    readonly removeAllBrowsers: () => void;
    readonly setApiKey: (apiKey: string) => void;
    readonly setGoogleOauthToken: (token: string) => void;
    readonly setOauthToken: (token: string, host: string) => void;
    readonly getAllBrowsers: () => Browser[];
    /**
     * This function provided so clients can inform igv of a visibility change, typically when an igv instance is
     * made visible from a tab, accordion, or similar widget.
     */
    readonly visibilityChange: () => Promise<void>;
    readonly version: () => string;
}

declare const igv: IGV;

export default igv;