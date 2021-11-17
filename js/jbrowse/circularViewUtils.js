import {getChrColor} from "../bam/bamTrack.js";
import Locus from "../locus.js";
import CircularView from "../../node_modules/circular-view/js/circularView.js";
import IGVColor from "../../node_modules/igv-utils/src/igv-color.js";

/**
 * The minimum length for a VCF structural variant.  VCF records < this length are ignored in the circular view
 * @type {number}
 */
const MINIMUM_SV_LENGTH = 1000000;

const circViewIsInstalled = () => CircularView.isInstalled();

const shortChrName = (chrName) => {
    return chrName.startsWith("chr") ? chrName.substring(3) : chrName;
}

const makePairedAlignmentChords = (alignments) => {

    const chords = [];
    for (let a of alignments) {
        const mate = a.mate;
        if (mate && mate.chr && mate.position) {
            chords.push({
                uniqueId: a.readName,
                refName: shortChrName(a.chr),
                start: a.start,
                end: a.end,
                mate: {
                    refName: shortChrName(mate.chr),
                    start: mate.position - 1,
                    end: mate.position,
                }
            });
        }
    }
    return chords;
}

const makeBedPEChords = (features) => {

    return features.map(v => {

        // If v is a whole-genome feature, get the true underlying variant.
        const f = v._f || v;

        return {
            uniqueId: `${f.chr1}:${f.start1}-${f.end1}_${f.chr2}:${f.start2}-${f.end2}`,
            refName: shortChrName(f.chr1),
            start: f.start1,
            end: f.end1,
            mate: {
                refName: shortChrName(f.chr2),
                start: f.start2,
                end: f.end2,
            }
        }
    })
}


const makeVCFChords = (features) => {

    const svFeatures = features.filter(v => {
        const f = v._f || v;
        const isLargeEnough = f.info && f.info.CHR2 && f.info.END &&
            (f.info.CHR2 !== f.chr || Math.abs(Number.parseInt(f.info.END) - f.pos) > MINIMUM_SV_LENGTH);
        return isLargeEnough;
    });
    return svFeatures.map(v => {

        // If v is a whole-genome feature, get the true underlying variant.
        const f = v._f || v;

        const pos2 = Number.parseInt(f.info.END);
        const start2 = pos2 - 100;
        const end2 = pos2 + 100;

        return {
            uniqueId: `${f.chr}:${f.start}-${f.end}_${f.info.CHR2}:${f.info.END}`,
            refName: shortChrName(f.chr),
            start: f.start,
            end: f.end,
            mate: {
                refName: shortChrName(f.info.CHR2),
                start: start2,
                end: end2
            }
        }
    })
}

function makeCircViewChromosomes(genome) {
    const regions = [];
    const colors = [];
    for (let chrName of genome.wgChromosomeNames) {
        const chr = genome.getChromosome(chrName);
        colors.push(getChrColor(chr.name));
        regions.push(
            {
                name: chr.name,
                bpLength: chr.bpLength
            }
        )
    }
    return regions;
}


function createCircularView(el, browser) {

    const circularView = new CircularView(el, {

        onChordClick: (feature, chordTrack, pluginManager) => {

            const f1 = feature.data;
            const f2 = f1.mate;
            const flanking = 2000;

            const l1 = new Locus({chr: browser.genome.getChromosomeName(f1.refName), start: f1.start, end: f1.end});
            const l2 = new Locus({chr: browser.genome.getChromosomeName(f2.refName), start: f2.start, end: f2.end});

            let loci;

            // If there is overlap with current loci

            loci = browser.currentLoci().map(str => Locus.fromLocusString(str));

            // if(loci.some(locus =>  locus.contains(l1)) || loci.some(locus => locus.contains(l2))) {
            //     for (let l of [l1, l2]) {
            //         if (!loci.some(locus => {
            //             return locus.contains(l)
            //         })) {
            //             // add flanking
            //             l.start = Math.max(0, l.start - flanking);
            //             l.end += flanking;
            //             loci.push(l)
            //         }
            //     }
            // } else {
                l1.start = Math.max(0, l1.start - flanking);
                l1.end += flanking;
                l2.start = Math.max(0, l2.start - flanking);
                l2.end += flanking;
                loci = [l1, l2];
            //}

            const searchString = loci.map(l => l.getLocusString()).join(" ");
            browser.search(searchString);
        }
    });

    return circularView;
}

export {
    circViewIsInstalled,
    makeBedPEChords,
    makePairedAlignmentChords,
    makeVCFChords,
    createCircularView,
    makeCircViewChromosomes
}

