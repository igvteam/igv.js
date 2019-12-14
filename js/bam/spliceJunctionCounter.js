/**
 * A helper class for computing splice junctions from alignments.
 */

import Table from "../util/table.js"

class SpliceJunctionCounter {

    constructor(loadOptions) {
        this.loadOptions = loadOptions;
        this.allSpliceJunctionFeatures = [];
        this.filteredCombinedFeatures = null;
        this.posStartEndJunctionsMap = new Table();
        this.negStartEndJunctionsMap = new Table();
    }

    getFilteredJunctions(strandOption) {

        let junctions;
        switch (strandOption) {
            case '+':
                junctions = this.posStartEndJunctionsMap.valuesArray();
                break;
            case '-':
                junctions = this.negStartEndJunctionsMap.valuesArray();
                break;
            default:
                junctions = this.combineStrandJunctionsMaps();
        }

        const filteredJunctions = this.filterJunctionList(this.loadOptions, junctions);
        filteredJunctions.sort(function(a, b) {
            return a.start - b.start;
        })
        return filteredJunctions;
    }

    addAlignment(alignment) {

        let gaps = alignment.gaps;
        if (!gaps) {
            return;
        }

        // Determine strand.  First check for explicit attribute.
        let isNegativeStrand;
        const strandAttr = alignment.tags()["XS"];
        if (strandAttr != null) {
            isNegativeStrand = strandAttr.toString().charAt(0) == '-';
        } else {
            //  if (alignment.isPaired()) {
            //     isNegativeStrand = "-" === alignment.getFirstOfPairStrand();  //<= TODO -- this isn't correct for all libraries.
            //  } else {
            isNegativeStrand = alignment.isNegativeStrand();
            // }
        }

        const startEndJunctionsTableThisStrand =
            isNegativeStrand ? this.negStartEndJunctionsMap : this.posStartEndJunctionsMap;


        // For each gap marked "skip" (cigar N), create or add evidence to a splice junction
        for (let spliceGap of gaps) {
            if("N" !== spliceGap.type) continue;
            const junctionStart = spliceGap.start;
            const junctionEnd = junctionStart + spliceGap.len;
            let junction = startEndJunctionsTableThisStrand.get(junctionStart, junctionEnd);
            if(junction) {
                junction.value++;
            } else {
                junction = {chr: alignment.chr, start: junctionStart, end: junctionEnd, value: 1};
                startEndJunctionsTableThisStrand.set(junctionStart, junctionEnd, junction);
                this.allSpliceJunctionFeatures.push(junction);
            }
        }
    }

    filterJunctionList(loadOptions, unfiltered) {
        if (loadOptions.minJunctionCoverage > 1) {
            return unfiltered.filter(j => j.value >= loadOptions.minJunctionCoverage)
        } else {
            return unfiltered;
        }
    }


    /**
     * Combine junctions from both strands.  Used for Sashimi plot.
     * Note: Flanking depth arrays are not combined.
     */
    combineStrandJunctionsMaps() {

        // Start with all + junctions
        const combinedMap = new Table();

        for (let posFeature of this.posStartEndJunctionsMap.valuesArray()) {
            const combinedFeature = Object.assign({}, posFeature);
            combinedMap.set(combinedFeature.start, combinedFeature.end, combinedFeature);
        }

        // Merge in - junctions
        for (let negFeature of this.negStartEndJunctionsMap.values()) {
            const junctionStart = negFeature.start;
            const junctionEnd = negFeature.end;
            const junction = combinedMap.get(negFeature.start, junctionEnd);
            if (!junction) {
                // No existing (+) junction here, just add the (-) one\
                const combinedFeature = Object.assign({}, negFeature);
                combinedMap.set(junctionStart, junctionEnd, combinedFeature);
            } else {
                junction.value += negFeature.value;
            }
        }

        return combinedMap.valuesArray();
    }


    setLoadOptions(loadOptions) {
        this.loadOptions = loadOptions;
    }
}

class LoadOptions {
    constructor(minJunctionCoverage, minReadFlankingWidth) {
        this.minJunctionCoverage = minJunctionCoverage;
        this.minReadFlankingWidth = minReadFlankingWidth;

    }
}

export default SpliceJunctionCounter
