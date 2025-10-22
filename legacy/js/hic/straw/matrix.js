import BinaryParser from "./binary.js"
import MatrixZoomData from "./matrixZoomData.js"

class Matrix {

    constructor(chr1, chr2, zoomDataList) {
        this.chr1 = chr1
        this.chr2 = chr2
        this.bpZoomData = []
        this.fragZoomData = []
        for (let zd of zoomDataList) {
            if (zd.zoom.unit === "BP") {
                this.bpZoomData.push(zd)
            } else {
                this.fragZoomData.push(zd)
            }
        }
    }

    /**
     * Find the best zoom level for the given bin size
     * @param binSize
     * @param unit
     * @returns {number}
     */
    findZoomForResolution(binSize, unit) {
        const zdArray = "FRAG" === unit ? this.fragZoomData : this.bpZoomData
        for (let i = 1; i < zdArray.length; i++) {
            var zd = zdArray[i]
            if (zd.zoom.binSize < binSize) {
                return i - 1
            }
        }
        return zdArray.length - 1
    }

    /**
     * Fetch zoom data by bin size.  If no matching level exists return undefined.
     *
     * @param unit
     * @param binSize
     * @param zoom
     * @returns {undefined|*}
     */
    getZoomData(binSize, unit) {
        unit = unit || "BP"
        const zdArray = unit === "BP" ? this.bpZoomData : this.fragZoomData;
        for (let i = 0; i < zdArray.length; i++) {
            var zd = zdArray[i];
            if (binSize === zd.zoom.binSize) {
                return zd
            }
        }
        return undefined
    }

    /**
     * Return zoom data by resolution index.
     * @param index
     * @param unit
     * @returns {*}
     */
    getZoomDataByIndex(index, unit) {
        const zdArray = "FRAG" === unit ? this.fragZoomData : this.bpZoomData
        return zdArray[index]
    }

    static getKey(chrIdx1, chrIdx2) {
        if (chrIdx1 > chrIdx2) {
            const tmp = chrIdx1
            chrIdx1 = chrIdx2
            chrIdx2 = tmp
        }
        return `${chrIdx1}_${chrIdx2}`;
    }

    static parseMatrix(data, chromosomes) {

        const dis = new BinaryParser(new DataView(data));
        const c1 = dis.getInt();     // Should equal chrIdx1
        const c2 = dis.getInt();     // Should equal chrIdx2

        // TODO validate this
        const chr1 = chromosomes[c1];
        const chr2 = chromosomes[c2];

        // # of resolution levels (bp and frags)
        let nResolutions = dis.getInt();
        const zdList = [];

        while (nResolutions-- > 0) {
            const zd = MatrixZoomData.parseMatrixZoomData(chr1, chr2, dis);
            zdList.push(zd);
        }
        return new Matrix(c1, c2, zdList);
    }

}

export default Matrix;