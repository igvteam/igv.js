import {findFeatureAfterCenter} from "./featureUtils.js"

class BaseFeatureSource {

    constructor(genome) {
        this.genome = genome
    }


    // Return the next feature whose start is > position.
    async nextFeature(chr, position, direction, visibilityWindow) {

        let chromosomeNames = this.genome.chromosomeNames || [chr]
        let idx = chromosomeNames.indexOf(chr)
        if (idx < 0) return // This shouldn't happen

        // Look ahead (or behind) in 10 kb intervals, but no further than visibilityWindow
        const window = Math.min(10000, visibilityWindow || 10000)
        let queryStart = direction ? position : Math.max(position - window, 0)
        while (idx < chromosomeNames.length && idx >= 0) {
            chr = chromosomeNames[idx]
            const chromosome = this.genome.getChromosome(chr)
            const chromosomeEnd = chromosome.bpLength
            while (queryStart < chromosomeEnd && queryStart >= 0) {
                let queryEnd = direction ? queryStart + window : Math.min(position, queryStart + window)
                const featureList = await this.getFeatures({chr, start: queryStart, end: queryEnd, visibilityWindow})
                if (featureList) {

                    const compare = (o1, o2) => o1.start - o2.start + o1.end - o2.end
                    const sortedList = Array.from(featureList)
                    sortedList.sort(compare)

                    // Search for next or previous feature relative to centers.  We use a linear search because the
                    // feature is likely to be near the first or end of the list
                    let idx = direction ? 0 : sortedList.length - 1
                    while(idx >= 0 && idx < sortedList.length) {
                        const f = sortedList[idx]
                        const center = (f.start + f.end) / 2
                        if(direction) {
                            if(center > position) return f
                            idx++
                        } else {
                            if(center < position) return f
                            idx--
                        }
                    }
                }
                queryStart = direction ? queryEnd : queryStart - window
            }
            if (direction) {
                idx++
                queryStart = 0
                position = 0
            } else {
                idx--
                if (idx < 0) break
                const prevChromosome = this.genome.getChromosome(chromosomeNames[idx])
                position = prevChromosome.bpLength
                queryStart = position - window
            }
        }
    }

    async previousFeature(chr, position, direction, visibilityWindow) {

        let chromosomeNames = this.genome.chromosomeNames || [chr]
        let idx = chromosomeNames.indexOf(chr)
        if (idx < 0) return // This shouldn't happen

        // Look ahead (or behind) in 10 kb intervals, but no further than visibilityWindow
        const window = Math.min(10000, visibilityWindow || 10000)
        let queryStart = direction ? position : Math.max(position - window, 0)
        while (idx < chromosomeNames.length && idx >= 0) {
            chr = chromosomeNames[idx]
            const chromosome = this.genome.getChromosome(chr)
            const chromosomeEnd = chromosome.bpLength
            while (queryStart < chromosomeEnd && queryStart >= 0) {
                let queryEnd = Math.min(position, queryStart + window)
                const featureList = await this.getFeatures({chr, start: queryStart, end: queryEnd, visibilityWindow})
                if (featureList) {

                    const compare = (o1, o2) => o1.start - o2.start + o1.end - o2.end
                    const sortedList = Array.from(featureList)
                    sortedList.sort(compare)

                    // Search for next or previous feature relative to centers.  We use a linear search because the
                    // feature is likely to be near the first or end of the list
                    let idx = direction ? 0 : sortedList.length - 1
                    while(idx >= 0 && idx < sortedList.length) {
                        const f = sortedList[idx]
                        const center = (f.start + f.end) / 2
                        if(direction) {
                            if(center > position) return f
                            idx++
                        } else {
                            if(center < position) return f
                            idx--
                        }
                    }
                }
                queryStart = direction ? queryEnd : queryStart - window
            }
            if (direction) {
                idx++
                queryStart = 0
                position = 0
            } else {
                idx--
                if (idx < 0) break
                const prevChromosome = this.genome.getChromosome(chromosomeNames[idx])
                position = prevChromosome.bpLength
                queryStart = position - window
            }
        }
    }

}

export default BaseFeatureSource

