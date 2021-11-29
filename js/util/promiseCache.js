class PromiseCache {

    constructor() {
        this.map = new Map()
    }

    getPromise(track, chr, bpStart, bpEnd, bpPerPixel, viewport) {

        let trackMap = this.map.get(track)
        if (!trackMap) {
            trackMap = new Map()
            this.map.set(track, trackMap)
        }

        if (trackMap.size > 0) {
            console.log()
        }

        const windowFunction = track.windowFunction
        const key = `${chr}_${bpStart}_${bpEnd}_${bpPerPixel}_${windowFunction}`
        if (trackMap.has(key)) {
            return trackMap.get(key)
        } else {
            const p = track.getFeatures(chr, bpStart, bpEnd, bpPerPixel, viewport)
            trackMap.set(key, p)
            return p
        }
    }

}


export default PromiseCache