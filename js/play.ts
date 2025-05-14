import type { CreateOpt, TrackLoad, Tracks, TrackType } from './igv';
import igv from './igv';

let b = await igv.createBrowser(document.getElementById('igv-app')!, {
    // you get completions for possible hosted genomes based on docs, but if you specify a different string it will still accept it
    // if you start an object, you get hints for required and optional fields for custom genomes
    "genome": "hg38",
    "tracks": [
        // this definition is missing a data source, so this will not check
        // @ts-expect-error
        {
            // you will get completions for possible track types
            "type": "wig",
            // once you specify a type, you get completions for possible formats only for that type
            "format": "bigWig",
        },
        // this will check all options are valid for an annotation track
        {
            "type": "annotation",
            "url": "/data/genes/genes.gff3",
            "displayMode": "EXPANDED",
        },
        // this will not check, format mismatches type
        // @ts-expect-error
        {
            "type": "annotation",
            "url": "my.bigWig",
            "displayMode": "EXPANDED",
        },
        {
            // even just a url will infer the type
            // the options will be restricted to the inferred type and wrong options will be caught
            // however autocomplete will still show all possible options, possible due to reduce performance cost
            "url": "my.vcf.gz?param=1",
        },
        // this is valid
        {
            "type": "seg",
            "isLog": true,
            "features": [],
        },
        // gzipped files can be inferred too, `isLog` is not for variant tracks, so this will not check
        // @ts-expect-error
        {
            "url": "my.vcf.gz?param=1",
            "isLog": true,
        },
        // you can override things if you really need to
        {
            "type": "alignment",
            "format": "sam" as Tracks.AlignmentFormat,
            "sort": {
                "chr": "chr1",
                "position": 123456,
                "option": "BASE",
            },
            "url": "my.sam",
            ...({
                "somethingNew": "yes",
            } as {})
        },
        {
            "type": "gwas",
            "format": "bed",
            "columns": {
                // this should take a number, so this will not check
                // @ts-expect-error
                "chromosome": "chr1",
                "position": 1,
                "value": 1,
            }
        }
    ],
});


b.search('chr1:123456-123457');

// unfortunately here you need to give it a little encouragement to return the subtype instead of the generalized type
let t = await b.loadTrack<'alignment'>({
    "url": "my.bam",
});

// now you can use the alignment track-specific methods
t.sort({
    "chr": "chr1",
    "position": 123456,
    "option": "BASE",
    // options is not 'TAG', so this will not check
    // @ts-expect-error
    "tag": "AS",
})

b.on('trackclick', (track, _popoverData) => {
    // this gets inferred as a track
    let _: Tracks.Track = track;

    return true;
});

b.on('trackremoved', (track) => {
    // this gets inferred differently based on the event name
    let _: Tracks.Track[] = track;
});