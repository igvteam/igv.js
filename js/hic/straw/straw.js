import HicFile from "./hicFile.js"

class Straw {

    constructor(config) {
        this.config = config;
        this.hicFile = new HicFile(config);
    }

    async getMetaData() {
        return await this.hicFile.getMetaData()
    }

    //straw <NONE/VC/VC_SQRT/KR> <ile> <chr1>[:x1:x2] <chr2>[:y1:y2] <BP/FRAG> <binsize>
    async getContactRecords(normalization, region1, region2, units, binsize) {
        return this.hicFile.getContactRecords(normalization, region1, region2, units, binsize);
    }

    async getNormalizationOptions() {
        return this.hicFile.getNormalizationOptions()
    }

    async getNVI() {
        await this.hicFile.getNormVectorIndex()
        return this.hicFile.config.nvi;
    }

    async printIndexStats() {
        await this.hicFile.printIndexStats();
    }

    getFileChrName(chrAlias) {
        if (this.hicFile.chrAliasTable.hasOwnProperty(chrAlias)) {
            return this.hicFile.chrAliasTable[chrAlias]
        } else {
            return chrAlias
        }
    }
}


export default Straw
