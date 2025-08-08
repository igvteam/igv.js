import HtsgetReader from "./htsgetReader.js"
import getDataWrapper from "../feature/dataWrapper.js"
import VcfParser from "../variant/vcfParser.js"
import {isgzipped, ungzip} from "../../node_modules/igv-utils/src/bgzf.js"
import ChromAliasManager from "../feature/chromAliasManager.js"

class HtsgetVariantReader extends HtsgetReader {

    constructor(config, genome) {
        super(config, genome)
        this.parser = new VcfParser()
    }

    async readHeader() {
        if (!this.header) {
            let data = await this.readHeaderData()
            if (isgzipped(data)) {
                data = ungzip(data)
            }

            const dataWrapper = getDataWrapper(data)
            this.header = await this.parser.parseHeader(dataWrapper, this.genome)
            if (this.header.sequenceNames && this.header.sequenceNames.length > 0) {
                this.chromAliasManager = new ChromAliasManager(this.header.sequenceNames, this.genome)
            }
        }
        return this.header
    }

    async readFeatures(chr, start, end) {

        if (this.config.format && this.config.format.toUpperCase() !== "VCF") {
            throw Error(`htsget format ${this.config.format} is not supported`)
        }

        if (!this.header) {
            await this.readHeader()
        }


        let queryChr = this.chromAliasManager ? await this.chromAliasManager.getAliasName(chr) : chr

        let data = await this.readData(queryChr, start, end)
        if (isgzipped(data)) {
            data = ungzip(data)
        }

        const dataWrapper = getDataWrapper(data)

        return this.parser.parseFeatures(dataWrapper)

        //  return dataWrapper;

    }
}


export default HtsgetVariantReader