import Locus from "../locus.js";

function makeAlignmentChord(a) {
    // Strip chr names -  a hack
    const chr = a.chr.startsWith("chr") ? a.chr.substring(3) : a.chr;
    const mateChr = a.mate.chr.startsWith("chr") ? a.mate.chr.substring(3) : a.chr;
    return {
        uniqueId: a.readName,
        refName: chr,
        start: a.start,
        end: a.end,
        mate: {
            refName: a.mate.chr,
            start: a.mate.position - 1,
            end: a.mate.position,
        },
        color: `rgba(0, 0, 255, 0.02)`,
        baseColor: `rgba(0, 0, 255, 0.02)`,
        highlightColor: 'red',
        igvtype: 'alignment'
    };
}

function makeBedPEChord(f, color) {
    color = color || `rgba(0, 0, 255, 0.02)`;
    // Strip chr names -  a hack
    const chr1 = f.chr1.startsWith("chr") ? f.chr1.substring(3) : f.chr1;
    const chr2 = f.chr2.startsWith("chr") ? f.chr2.substring(3) : f.chr2;

    return {
        uniqueId: bedPEID(f),
        refName: chr1,
        start: f.start1,
        end: f.end1,
        mate: {
            refName: chr2,
            start: f.start2,
            end: f.end2,
        },
        color: color,
        baseColor: color,
        highlightColor: 'red',
        igvtype: 'bedpe'
    };
}

class CircularView {

    constructor(div) {

        const {createElement} = React
        const {render} = ReactDOM
        const {
            createViewState,
            JBrowseCircularGenomeView,
        } = JBrowseReactCircularGenomeView

        // Keep a copy fo the chords sent to JBrowse until we know how to append to the current set.
        this.chords = [];

        this.circularState = new createViewState({
            assembly: {
                name: 'forIGV',
                sequence: {
                    trackId: 'refSeqTrack',
                    type: 'ReferenceSequenceTrack',
                    adapter: {
                        type: 'FromConfigSequenceAdapter',
                        features: [],
                    },
                },
            },
            tracks: [
                {
                    trackId: 'firstTrack',
                    assemblyNames: ['forIGV'],
                    type: 'VariantTrack',
                    adapter: {
                        type: 'FromConfigAdapter',
                        features: this.chords,
                    },
                },
            ],
        })

        this.circularState.config.tracks[0].displays[0].renderer.strokeColor.set(
            "jexl:get(feature, 'color') || 'black'"
        )
        this.circularState.config.tracks[0].displays[0].renderer.strokeColorSelected.set(
            "jexl:get(feature, 'highlightColor') || 'red'"
        )

        this.setHeight(div.clientWidth)

        // Harcode chord click action for now
        this.onChordClick(defaultOnChordClick.bind(this))


        render(createElement(JBrowseCircularGenomeView, {viewState: this.circularState}), div)
    }

    setHeight(height) {
        this.circularState.session.view.setHeight(height /* this is the height of the area inside the border in pixels */)
    }

    clearChords() {
        this.circularState.config.tracks[0].adapter.features.set([])
        this.circularState.session.view.showTrack(this.circularState.config.tracks[0].trackId)
    }

    addPairedAlignmentChords(alignments) {

        const chords = [...this.circularState.config.tracks[0].adapter.features.value];
        const currentIDs = new Set(chords.map(c => c.uniqueId));

        for (let a of alignments) {
            const id = a.readName;
            const mate = a.mate;
            if (mate && mate.chr && mate.position && !currentIDs.has(id)) {
                chords.push(makeAlignmentChord(a))
                currentIDs.add(id);
            }
        }
        this.circularState.config.tracks[0].adapter.features.set(chords)
        this.circularState.session.view.showTrack(this.circularState.config.tracks[0].trackId)
    }

    addBedPEChords(features, color) {

        const chords = [...this.circularState.config.tracks[0].adapter.features.value];
        const currentIDs = new Set(chords.map(c => c.uniqueId));
        for (let f of features) {
            const id = bedPEID(f);
            if (!currentIDs.has(id)) {
                chords.push(makeBedPEChord(f, color))
                currentIDs.add(id);
            }
        }
        this.circularState.config.tracks[0].adapter.features.set(chords)
        this.circularState.session.view.showTrack(this.circularState.config.tracks[0].trackId)

    }

    selectAlignmentChord(alignment) {
        const chords = [...this.circularState.config.tracks[0].adapter.features.value];
        let found = false;
        const featureId = alignment.readName;
        for (let f of chords) {
            if (featureId === f.uniqueId) {
                f.color = f.highlightColor;
                found = true;
                break;
            }
        }
        if (!found) {
            const f = makeAlignmentChord(alignment);
            f.color = f.highlightColor;
            chords.push(f);
        }
        this.circularState.config.tracks[0].adapter.features.set(chords)
        this.circularState.session.view.showTrack(this.circularState.config.tracks[0].trackId)
    }

    selectChord(featureId) {
        //let feature = this.getFeature(featureId);
        //this.circularState.pluginManager.rootModel.session.setSelection(feature)
    }

    clearSelection() {
        //this.circularState.pluginManager.rootModel.session.clearSelection()
        const chords = [...this.circularState.config.tracks[0].adapter.features.value];
        for (let f of chords) {
            f.color = f.baseColor;
        }
        this.circularState.config.tracks[0].adapter.features.set(chords)
        this.circularState.session.view.showTrack(this.circularState.config.tracks[0].trackId)
    }

    getFeature(featureId) {

        const display = this.circularState.pluginManager.rootModel.session.view.tracks[0].displays[0]
        const feature = display.data.features.get(featureId)
        return feature;

        // const feature = [...this.circularState.config.tracks[0].adapter.features.value];
        // for(let f of feature) {
        //     if(featureId === f.uniqueId) {
        //         return f;
        //     }
        // }
    }

    onChordClick(callback) {
        this.circularState.pluginManager.jexl.addFunction('onChordClick', callback)
        this.circularState.config.tracks[0].displays[0].onChordClick.set(
            'jexl:onChordClick(feature, track, pluginManager)'
        )
    }

}


// Default chord click callback.  Will be bound to a CircularView instance
function defaultOnChordClick(feature, chordTrack, pluginManager) {

    if (this.browser) {

        const f1 = feature.data;
        const f2 = f1.mate;
        const flanking = 2000;

        const l1 = new Locus({chr: this.browser.genome.getChromosomeName(f1.refName), start: f1.start, end: f1.end});
        const l2 = new Locus({chr: this.browser.genome.getChromosomeName(f2.refName), start: f2.start, end: f2.end});

        let loci;
        if ("alignment" === f1.igvtype) {   // append
            loci = this.browser.currentLoci().map(str => Locus.fromLocusString(str));
            for (let l of [l1, l2]) {
                if (!loci.some(locus => {
                    return locus.contains(l)
                })) {
                    // add flanking
                    l.start = Math.max(0, l.start - flanking);
                    l.end += flanking;
                    loci.push(l)
                }
            }
        } else {
            l1.start = Math.max(0, l1.start - flanking);
            l1.end += flanking;
            l2.start = Math.max(0, l2.start - flanking);
            l2.end += flanking;
            loci = [l1, l2];
        }

        const searchString = loci.map(l => l.getLocusString()).join(" ");
        this.browser.search(searchString);

    } else {
        console.log(feature)
    }
}


function bedPEID(f) {
    return `${f.chr1}:${f.start1}-${f.end1}_${f.chr2}:${f.start2}-${f.end2}`
}


export default CircularView;