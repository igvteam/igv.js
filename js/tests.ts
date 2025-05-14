import igv, { CreateOpt, TrackLoad, TrackType, URLInference } from './igv';


const IGV_TARGETS = ["H3K4me3", "H3K27me3"];
const IGV_COLORS = ["green", "red"];
const CHR = "chr11";
const VIEWPORT_CENTER = 101_173_617;
const VIEWPORT_EXTENT = 300_000;
const LOCUS_SEARCH = `${CHR}:${VIEWPORT_CENTER - VIEWPORT_EXTENT / 2}-${VIEWPORT_CENTER + VIEWPORT_EXTENT / 2}`;

~async function () {
    const igvDiv = document.getElementById('igv-app');

    // this will check that the options match any track type
    const ann_track: TrackLoad<TrackType> = {
        name: "MysteryFactorX",
        type: "annotation",
        format: "bed",
        url: "/data/MysteryFactorX_ChIPseq_mm10.bed"
    };
    // this will check that the options are actually for a wig track
    const wig_tracks: TrackLoad<'wig'>[] = IGV_TARGETS
        .map((target, i) => ({
            name: target,
            min: 0,
            max: 4.0,
            autoscale: false,
            type: "wig",
            format: "bigWig",
            url: `/submodules/mikkelson_2007/bowtie2/mergedLibrary/bigwig/ES_${target}_IP.bigWig`,
            color: IGV_COLORS[i]
        }));

    // this doesn't match any track type, so this will not check
    const wrong_track: TrackLoad<TrackType> = {
        name: "MysteryFactorX",
        type: "annotation",
        // @ts-expect-error
        format: "wig",
        url: "/data/MysteryFactorX_ChIPseq_mm10.bed"
    };

    const u: URLInference.URLWithExtension<'mut'> = 'https://s3.amazonaws.com/igv.org.demo/TCGA.BRCA.mutect.995c0111-d90b-4140-bee7-3845436c3b42.DR-10.0.somatic.mut.gz'


    const igvOptions: CreateOpt = {
        genome: 'mm10',
        locus: LOCUS_SEARCH,
        nucleotideColors: {
            A: 'red',
            C: 'blue',
            T: 'green',
            G: 'orange',
            N: 'black',
            // @ts-expect-error
            a: 'red',
        },
        tracks: [...wig_tracks, ann_track, {
            format: 'maf',
            type: 'mut',
            url: 'https://s3.amazonaws.com/igv.org.demo/TCGA.BRCA.mutect.995c0111-d90b-4140-bee7-3845436c3b42.DR-10.0.somatic.mut.gz',
            height: 700,
            displayMode: "EXPANDED",
        }]
    };

    if (!igvDiv) {
        throw new Error('could not find igv-app element');
    }

    const igvapp = await igv.createBrowser(igvDiv, igvOptions);

    igvapp.on('trackclick', (track, popoverData) => {
        console.log('trackclick', track, popoverData);

        return true;
    });

    // @ts-expect-error
    const igvappBad = await igv.createBrowser(igvDiv!, { gename: 'mm10' });

    const igvsvg = igvapp.toSVG();
    const svgBlob = new Blob([igvsvg], {
        type: 'image/svg+xml'
    });
    const svgUrl = URL.createObjectURL(svgBlob);
    const svgLink = document.createElement('a');
    svgLink.href = svgUrl;
    svgLink.download = 'igv.svg';
    svgLink.innerText = 'Download SVG';
    document.body.appendChild(svgLink);

}()
