import {getChrColor} from "../bam/bamTrack.js"
import Locus from "../locus.js"
import {CircularView} from "../../node_modules/circular-view/dist/circular-view.js"
import {createSupplementaryAlignments} from "../bam/supplementaryAlignment.js"
import {IGVColor} from "../../node_modules/igv-utils/src/index.js"

/**
 * The minimum length for a VCF structural variant.  VCF records < this length are ignored in the circular view
 * @type {number}
 */
const MINIMUM_SV_LENGTH = 1000000

const circViewIsInstalled = () => CircularView.isInstalled()

const shortChrName = (chrName) => {
    return chrName.startsWith("chr") ? chrName.substring(3) : chrName
}

const makePairedAlignmentChords = (alignments) => {

    const chords = []
    for (let a of alignments) {
        const mate = a.mate
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
            })
        }
    }
    return chords
}

const makeSupplementalAlignmentChords = (alignments) => {
    const chords = []
    for (let a of alignments) {
        const sa = a.tags()['SA']
        const supAl = createSupplementaryAlignments(sa)
        let n = 0
        for (let s of supAl) {
            if (s.start !== a.start) {
                chords.push({
                    uniqueId: `${a.readName}_${n++}`,
                    refName: shortChrName(a.chr),
                    start: a.start,
                    end: a.end,
                    mate: {
                        refName: shortChrName(s.chr),
                        start: s.start,
                        end: s.start + s.lenOnRef
                    }
                })
            }
        }
    }
    return chords
}

const makeBedPEChords = (features) => {

    return features.map(v => {

        // If v is a whole-genome feature, get the true underlying variant.
        const f = v._f || v

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
        const f = v._f || v
        const isLargeEnough = f.info && f.info.CHR2 && f.info.END &&
            (f.info.CHR2 !== f.chr || Math.abs(Number.parseInt(f.info.END) - f.pos) > MINIMUM_SV_LENGTH)
        return isLargeEnough
    })
    return svFeatures.map(v => {

        // If v is a whole-genome feature, get the true underlying variant.
        const f = v._f || v

        const pos2 = Number.parseInt(f.info.END)
        const start2 = pos2 - 100
        const end2 = pos2 + 100

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
    const regions = []
    const colors = []
    for (let chrName of genome.wgChromosomeNames) {
        const chr = genome.getChromosome(chrName)
        colors.push(getChrColor(chr.name))
        regions.push(
            {
                name: chr.name,
                bpLength: chr.bpLength
            }
        )
    }
    return regions
}

function sendChords(chords, track, refFrame, alpha) {

    const chordSetColor = IGVColor.addAlpha("all" === refFrame.chr ? track.color : getChrColor(refFrame.chr), alpha)
    const trackColor = IGVColor.addAlpha(track.color || 'rgb(0,0,255)', alpha)

    // name the chord set to include locus and filtering information
    const encodedName = track.name.replaceAll(' ', '%20')
    const chordSetName = "all" === refFrame.chr ? encodedName :
        `${encodedName}  ${refFrame.chr}:${refFrame.start}-${refFrame.end}`
    track.browser.circularView.addChords(chords, {track: chordSetName, color: chordSetColor, trackColor: trackColor})

    // show circular view if hidden
    if(!track.browser.circularViewVisible) track.browser.circularViewVisible = true

}


function createCircularView(el, browser) {

    const circularView = new CircularView(el, {

        onChordClick: (feature, chordTrack, pluginManager) => {

            const f1 = feature.data
            const f2 = f1.mate
            addFrameForFeature(f1)
            addFrameForFeature(f2)

            function addFrameForFeature(feature) {

                feature.chr = browser.genome.getChromosomeName(feature.refName)
                let frameFound = false
                for (let referenceFrame of browser.referenceFrameList) {
                    const l = Locus.fromLocusString(referenceFrame.getLocusString())
                    if (l.contains(feature)) {
                        frameFound = true
                        break
                    } else if (l.overlaps(feature)) {
                        referenceFrame.extend(feature)
                        frameFound = true
                        break
                    }
                }
                if (!frameFound) {
                    const flanking = 2000
                    const center = (feature.start + feature.end) / 2
                    browser.addMultiLocusPanel(feature.chr, center - flanking, center + flanking)

                }
            }
        }
    })

    return circularView
}

export {
    circViewIsInstalled,
    makeBedPEChords,
    makePairedAlignmentChords,
    makeSupplementalAlignmentChords,
    makeVCFChords,
    createCircularView,
    makeCircViewChromosomes,
    sendChords
}

