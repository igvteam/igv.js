import {BGZip} from "../../../node_modules/igv-utils/src/index.js"
import IGVRemoteFile from "./io/igvRemoteFile.js"
import BrowserLocalFile from './io/browserLocalFile.js';
import ThrottledFile from './io/throttledFile.js';
import RateLimiter from './io/rateLimiter.js';
import BufferedFile from './io/bufferedFile.js';
import BinaryParser from './binary.js';
import Matrix from './matrix.js';
import ContactRecord from './contactRecord.js';
import LRU from './lru.js';
import NormalizationVector from "./normalizationVector.js";
import nvi from './nvi.js'


const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
const Short_MIN_VALUE = -32768;
const DOUBLE = 8
const FLOAT = 4
const LONG = 8;
const INT = 4;
const GoogleRateLimiter = new RateLimiter(100)


class HicFile {

    constructor(args) {

        if (args.alert) {
            this.alert = args.alert
        }

        this.config = args

        this.loadFragData = args.loadFragData
        this.fragmentSitesCache = {}
        this.normVectorCache = new LRU(10)
        this.normalizationTypes = ['NONE'];
        this.matrixCache = new LRU(10);
        this.blockCache = new BlockCache();

        // args may specify an io.File object, a local path (Node only), or a url
        if (args.file) {
            this.file = args.file
        } else if (args.blob) {
            this.file = new BrowserLocalFile(args.blob)
        } else if (args.url || (args.path && !isNode)) {
            this.url = args.url || this.path;
            this.remote = true

            // Google drive must be rate limited.  Perhaps all remote files should be rate limited?
            const remoteFile = new IGVRemoteFile(args)
            if (isGoogleDrive(this.url)) {
                this.file = new ThrottledFile(remoteFile, GoogleRateLimiter)
            } else {
                this.file = remoteFile
            }
        } else if (args.path) {
            // path argument, assumed local file
            throw Error(`path property is deprecated, use NodeLocalFile`)
        } else {
            throw Error("Arguments must include file, blob, url, or path")
        }
    }

    async init() {

        if (this.initialized) {
            return;
        } else {
            await this.readHeaderAndFooter()
            // Footer is read with header
            //await this.readFooter()
            this.initialized = true
        }
    }

    async getVersion() {
        if (this.version === undefined) {
            const data = await this.file.read(0, 128)
            if (!data) {
                return undefined;
            }
            const binaryParser = new BinaryParser(new DataView(data));
            this.magic = binaryParser.getString();
            this.version = binaryParser.getInt();
            return this.version
        } else {
            return this.version
        }
    }

    async getMetaData() {
        await this.init()
        return this.meta
    }

    async readHeaderAndFooter() {

        // Read initial fields magic, version, and footer position
        let data = await this.file.read(0, 16)
        if (!data || data.byteLength === 0) {
            throw Error("File content is empty")
        }
        let binaryParser = new BinaryParser(new DataView(data));
        this.magic = binaryParser.getString();
        this.version = binaryParser.getInt();
        if (this.version < 5) {
            throw Error("Unsupported hic version: " + this.version)
        }
        this.footerPosition = binaryParser.getLong();

        // Read footer and determine file position for body section (i.e. end of header)

        await this.readFooter();

        const bodyPostion = Object.values(this.masterIndex).reduce((min, currentValue) => {
            return Math.min(min, currentValue.start)
        }, Number.MAX_VALUE)

        const remainingSize = bodyPostion - 16;
        data = await this.file.read(16, remainingSize);
        binaryParser = new BinaryParser(new DataView(data));

        this.genomeId = binaryParser.getString();

        if (this.version >= 9) {
            this.normVectorIndexPosition = binaryParser.getLong();
            this.normVectorIndexSize = binaryParser.getLong();
        }

        this.attributes = {};
        let nAttributes = binaryParser.getInt();
        while (nAttributes-- > 0) {
            this.attributes[binaryParser.getString()] = binaryParser.getString();
        }

        this.chromosomes = [];
        this.chromosomeIndexMap = {}
        let nChrs = binaryParser.getInt();
        let i = 0
        while (nChrs-- > 0) {
            const chr = {
                index: i,
                name: binaryParser.getString(),
                size: this.version < 9 ? binaryParser.getInt() : binaryParser.getLong()
            };
            if (chr.name.toLowerCase() === "all") {
                this.wholeGenomeChromosome = chr;
                this.wholeGenomeResolution = Math.round(chr.size * (1000 / 500));    // Hardcoded in juicer
            }
            this.chromosomes.push(chr);
            this.chromosomeIndexMap[chr.name] = chr.index
            i++;
        }

        this.bpResolutions = [];
        let nBpResolutions = binaryParser.getInt();
        while (nBpResolutions-- > 0) {
            this.bpResolutions.push(binaryParser.getInt());
        }

        if (this.loadFragData) {
            this.fragResolutions = [];
            let nFragResolutions = binaryParser.getInt();
            if (nFragResolutions > 0) {
                while (nFragResolutions-- > 0) {
                    this.fragResolutions.push(binaryParser.getInt());
                }

                // this.sites = [];
                // for(let i=0; i<this.chromosomes.length - 1; i++) {
                //     const chrSites = [];
                //     this.sites.push(chrSites);
                //     let nSites = binaryParser.getInt();
                //     console.log(nSites);
                //     for(let s=0; s<nSites; s++) {
                //         chrSites.push(binaryParser.getInt());
                //     }
                // }
            }
        }

        // Build lookup table for well-known chr aliases
        this.chrAliasTable = {}
        for (let chrName of Object.keys(this.chromosomeIndexMap)) {

            if (chrName.startsWith("chr")) {
                this.chrAliasTable[chrName.substr(3)] = chrName
            } else if (chrName === "MT") {
                this.chrAliasTable["chrM"] = chrName
            } else {
                this.chrAliasTable["chr" + chrName] = chrName
            }
        }


        // Meta data for the API
        this.meta = {
            "version": this.version,
            "genome": this.genomeId,
            "chromosomes": this.chromosomes,
            "resolutions": this.bpResolutions,
        }


    }

    async readFooter() {


        const skip = this.version < 9 ? 8 : 12;
        let data = await this.file.read(this.footerPosition, skip)
        if (!data) {
            return null;
        }

        let binaryParser = new BinaryParser(new DataView(data))
        const nBytes = this.version < 9 ? binaryParser.getInt() : binaryParser.getLong()  // Total size, master index + expected values
        let nEntries = binaryParser.getInt()

        // Estimate the size of the master index. String length of key is unknown, be conservative (100 bytes)

        const miSize = nEntries * (100 + 64 + 32);
        data = await this.file.read(this.footerPosition + skip, Math.min(miSize, nBytes))

        binaryParser = new BinaryParser(new DataView(data));

        this.masterIndex = {}
        while (nEntries-- > 0) {
            const key = binaryParser.getString()
            const pos = binaryParser.getLong()
            const size = binaryParser.getInt()
            this.masterIndex[key] = {start: pos, size: size}
        }

        this.expectedValueVectors = {}

        // Expected values
        // const nExpValues = binaryParser.readInt();
        // while (nExpValues-- > 0) {
        //     type = "NONE";
        //     unit = binaryParser.getString();
        //     binSize = binaryParser.getInt();
        //     nValues = binaryParser.getInt();
        //     values = [];
        //     while (nValues-- > 0) {
        //         values.push(binaryParser.getDouble());
        //     }
        //
        //     nChrScaleFactors = binaryParser.getInt();
        //     normFactors = {};
        //     while (nChrScaleFactors-- > 0) {
        //         normFactors[binaryParser.getInt()] = binaryParser.getDouble();
        //     }
        //
        //     // key = unit + "_" + binSize + "_" + type;
        //     //  NOT USED YET SO DON'T STORE
        //     //  dataset.expectedValueVectors[key] =
        //     //      new ExpectedValueFunction(type, unit, binSize, values, normFactors);
        // }

        // normalized expected values start after expected value.  Add 4 for
        if (this.version > 5) {
            const skip = this.version < 9 ? 4 : 8;
            this.normExpectedValueVectorsPosition = this.footerPosition + skip + nBytes;
        }
        return this;
    };

    async printIndexStats() {

        let totalSize = 0;
        let maxSize = 0;
        let maxKey;
        await await this.init();
        for (let key of Object.keys(this.masterIndex)) {
            const entry = this.masterIndex[key];
            //  console.log(`${key}\t${entry.start}\t${entry.size}`)
            totalSize += entry.size;
            if (entry.size > maxSize) {
                maxSize = entry.size;
                maxKey = key;
            }
        }
        // console.log(`Total size  = ${totalSize}`);
        console.log(`${maxSize}  ${maxKey}  ${this.config.url}`)
    }

    async getMatrix(chrIdx1, chrIdx2) {
        const key = Matrix.getKey(chrIdx1, chrIdx2);
        if (this.matrixCache.has(key)) {
            return this.matrixCache.get(key);
        } else {
            const matrix = await this.readMatrix(chrIdx1, chrIdx2);
            this.matrixCache.set(key, matrix);
            return matrix;
        }
    }

    async readMatrix(chrIdx1, chrIdx2) {

        await this.init()

        if (chrIdx1 > chrIdx2) {
            const tmp = chrIdx1
            chrIdx1 = chrIdx2
            chrIdx2 = tmp
        }

        const key = Matrix.getKey(chrIdx1 , chrIdx2)
        const idx = this.masterIndex[key]
        if (!idx) {
            return undefined
        }
        const data = await this.file.read(idx.start, idx.size)
        if (!data) {
            return undefined
        }

        return Matrix.parseMatrix(data, this.chromosomes);

    }

    async getContactRecords(normalization, region1, region2, units, binsize, allRecords = false) {

        await this.init();

        const idx1 = this.chromosomeIndexMap[this.getFileChrName(region1.chr)];
        const idx2 = this.chromosomeIndexMap[this.getFileChrName(region2.chr)];

        const transpose = (idx1 > idx2) || (idx1 === idx2 && region1.start >= region2.end);
        if (transpose) {
            const tmp = region1
            region1 = region2;
            region2 = tmp;
        }

        const blocks = await this.getBlocks(region1, region2, units, binsize)
        if (!blocks || blocks.length === 0) {
            return []
        }

        const contactRecords = [];
        const x1 = region1.start / binsize
        const x2 = region1.end / binsize
        const y1 = region2.start / binsize
        const y2 = region2.end / binsize
        const nvX1 = Math.floor(x1);
        const nvX2 = Math.ceil(x2);
        const nvY1 = Math.floor(y1);
        const nvY2 = Math.ceil(y2);
        for (let block of blocks) {
            if (block) { // An undefined block is most likely caused by a base pair range outside the chromosome
                let normVector1;
                let normVector2;
                let isNorm = normalization && normalization !== "NONE";
                const chr1 = this.getFileChrName(region1.chr);
                const chr2 = this.getFileChrName(region2.chr);
                if (isNorm) {

                    const nv1 = await this.getNormalizationVector(normalization, chr1, units, binsize);
                    const nv2 = (chr1 === chr2) ? nv1 : await this.getNormalizationVector(normalization, chr2, units, binsize);

                    if (nv1 && nv2) {
                        normVector1 = await nv1.getValues(nvX1, nvX2);
                        normVector2 = await nv2.getValues(nvY1, nvY2);
                    } else {
                        isNorm = false;
                        // Raise message and switch pulldown
                    }
                }

                for (let rec of block.records) {
                    if (allRecords || (rec.bin1 >= x1 && rec.bin1 < x2 && rec.bin2 >= y1 && rec.bin2 < y2)) {
                        if (isNorm) {
                            const x = rec.bin1;
                            const y = rec.bin2;
                            const nvnv = normVector1[x - nvX1] * normVector2[y - nvY1];
                            if (nvnv !== 0 && !isNaN(nvnv)) {
                                const counts = rec.counts / nvnv;
                                contactRecords.push(new ContactRecord(x, y, counts));
                            }
                        } else {
                            contactRecords.push(rec);
                        }
                    }
                }

                if(this.percentile95 === undefined && block.records.length > 10) {
                    this.percentile95 = computePercentile(block.records, 95)
                }
            }
        }

        return contactRecords;
    }

    async getBlocks(region1, region2, unit, binSize) {

        const blockKey = (blockNumber, zd) => `${zd.getKey()}_${blockNumber}`

        await this.init()
        const chr1 = this.getFileChrName(region1.chr)
        const chr2 = this.getFileChrName(region2.chr)
        const idx1 = this.chromosomeIndexMap[chr1]
        const idx2 = this.chromosomeIndexMap[chr2]

        if (idx1 === undefined) {
            console.log("No chromosome named: " + region1.chr)
            return []
        }
        if (idx2 === undefined) {
            console.log("No chromosome named: " + region2.chr)
            return []
        }

        const matrix = await this.getMatrix(idx1, idx2)
        if (!matrix) {
            console.log("No matrix for " + region1.chr + "-" + region2.chr)
            return []
        }

        const zd = matrix.getZoomData(binSize, unit);
        if (!zd) {
            let msg = `No data avalailble for resolution: ${binSize}  for map ${region1.chr}-${region2.chr}`
            throw new Error(msg)
        }

        const blockNumbers = zd.getBlockNumbers(region1, region2, this.version);

        const blocks = [];
        const blockNumbersToQuery = [];
        for (let num of blockNumbers) {
            const key = blockKey(num, zd)
            if (this.blockCache.has(binSize, key)) {
                blocks.push(this.blockCache.get(binSize, key));
            } else {
                blockNumbersToQuery.push(num);
            }
        }

        const promises = blockNumbersToQuery.map(blockNumber => this.readBlock(blockNumber, zd));
        const newBlocks = await Promise.all(promises);
        for (let block of newBlocks) {
            if (block) {
                this.blockCache.set(binSize, blockKey(block.blockNumber, zd), block);
            }
        }
        return blocks.concat(newBlocks);
    }

    async readBlock(blockNumber, zd) {

        const idx = await zd.blockIndex.getBlockIndexEntry(blockNumber);

        if (!idx) {
            return undefined
        } else {
            let data = await this.file.read(idx.filePosition, idx.size)
            if (!data) {
                return undefined;
            }

            const plain = new BGZip.inflate(new Uint8Array(data));
            data = plain.buffer;

            const parser = new BinaryParser(new DataView(data));
            const nRecords = parser.getInt();
            const records = [];

            if (this.version < 7) {
                for (let i = 0; i < nRecords; i++) {
                    const binX = parser.getInt();
                    const binY = parser.getInt();
                    const counts = parser.getFloat();
                    records.push(new ContactRecord(binX, binY, counts));
                }
            } else {

                const binXOffset = parser.getInt();
                const binYOffset = parser.getInt();

                const useFloatContact = parser.getByte() === 1;
                const useIntXPos = this.version < 9 ? false : parser.getByte() == 1;
                const useIntYPos = this.version < 9 ? false : parser.getByte() == 1;
                const type = parser.getByte();

                if (type === 1) {
                    // List-of-rows representation
                    const rowCount = useIntYPos ? parser.getInt() : parser.getShort();
                    for (let i = 0; i < rowCount; i++) {
                        const dy = useIntYPos ? parser.getInt() : parser.getShort();
                        const binY = binYOffset + dy;
                        const colCount = useIntXPos ? parser.getInt() : parser.getShort();
                        for (let j = 0; j < colCount; j++) {
                            const dx = useIntXPos ? parser.getInt() : parser.getShort();
                            const binX = binXOffset + dx;
                            const counts = useFloatContact ? parser.getFloat() : parser.getShort();
                            records.push(new ContactRecord(binX, binY, counts));
                        }
                    }
                } else if (type == 2) {

                    const nPts = parser.getInt();
                    const w = parser.getShort();

                    for (let i = 0; i < nPts; i++) {
                        //int idx = (p.y - binOffset2) * w + (p.x - binOffset1);
                        const row = Math.floor(i / w);
                        const col = i - row * w;
                        const bin1 = binXOffset + col;
                        const bin2 = binYOffset + row;

                        if (useFloatContact) {
                            const counts = parser.getFloat();
                            if (!isNaN(counts)) {
                                records.push(new ContactRecord(bin1, bin2, counts));
                            }
                        } else {
                            const counts = parser.getShort();
                            if (counts != Short_MIN_VALUE) {
                                records.push(new ContactRecord(bin1, bin2, counts));
                            }
                        }
                    }
                } else {
                    throw new Error("Unknown block type: " + type);
                }

            }

            return new Block(blockNumber, zd, records, idx);


        }
    };

    async hasNormalizationVector(type, chr, unit, binSize) {
        await this.init()
        let chrIdx
        if (Number.isInteger(chr)) {
            chrIdx = chr
        } else {
            const canonicalName = this.getFileChrName(chr)
            chrIdx = this.chromosomeIndexMap[canonicalName]
        }
        const key = getNormalizationVectorKey(type, chrIdx, unit.toString(), binSize);
        const normVectorIndex = await this.getNormVectorIndex()
        return normVectorIndex && normVectorIndex[key];
    }

    async isNormalizationValueAvailableAtResolution(normalization, chr, unit, resolution) {

        let chromosomeIndex
        if (Number.isInteger(chr)) {
            chromosomeIndex = chr
        } else {
            const canonicalName = this.getFileChrName(chr)
            chromosomeIndex = this.chromosomeIndexMap[canonicalName]
        }

        const normVectorIndex = await this.getNormVectorIndex()

        const key = getNormalizationVectorKey(normalization, chromosomeIndex, unit.toString(), resolution)

        const index = normVectorIndex[key]

        return undefined !== index

    }

    async getNormalizationVector(type, chr, unit, binSize) {

        await this.init()

        let chrIdx
        if (Number.isInteger(chr)) {
            chrIdx = chr
        } else {
            const canonicalName = this.getFileChrName(chr)
            chrIdx = this.chromosomeIndexMap[canonicalName]
        }

        const key = getNormalizationVectorKey(type, chrIdx, unit.toString(), binSize);

        if (this.normVectorCache.has(key)) {
            return this.normVectorCache.get(key);
        }

        const normVectorIndex = await this.getNormVectorIndex()

        if (!normVectorIndex) {
            console.log("Normalization vectors not present in this file")
            return undefined
        }

        const status = await this.isNormalizationValueAvailableAtResolution(type, chr, unit, binSize)

        if (false === status) {

            const str = `Normalization option ${ type } not available at resolution ${ binSize }. Will use NONE.`
            console.log(str)

            if (this.alert) {
                this.alert(str)
            } 
            return undefined
        }

        const idx = normVectorIndex[key];

        const data = await this.file.read(idx.filePosition, 8)

        if (!data) {
            return undefined;
        }

        const parser = new BinaryParser(new DataView(data));
        const nValues = this.version < 9 ? parser.getInt() : parser.getLong();
        const dataType = this.version < 9 ? DOUBLE : FLOAT;
        const filePosition = this.version < 9 ? idx.filePosition + 4 : idx.filePosition + 8;
        const nv = new NormalizationVector(this.file, filePosition, nValues, dataType);
        this.normVectorCache.set(key, nv);
        return nv;

    }

    async getNormVectorIndex() {

        if (this.version < 6) {
            return undefined;
        }

        if (!this.normVectorIndex) {

            // If nvi is not supplied, try reading from remote lambda service
            if (!this.config.nvi && this.remote && this.url) {
                const url = new URL(this.url)
                const key = encodeURIComponent(url.hostname + url.pathname)
                if(nvi.hasOwnProperty(key)) {
                    this.config.nvi = nvi[key]
                }
            }

            if (this.config.nvi) {
                const nviArray = decodeURIComponent(this.config.nvi).split(",")
                const range = {start: parseInt(nviArray[0]), size: parseInt(nviArray[1])};
                return this.readNormVectorIndex(range)
            } else {
                try {
                    await this.readNormExpectedValuesAndNormVectorIndex()
                    return this.normVectorIndex
                } catch (e) {
                    if (e.code === "416" || e.code === 416) {
                        // This is expected if file does not contain norm vectors
                        this.normExpectedValueVectorsPosition = undefined
                    } else {
                        console.error(e)
                    }
                }
            }
        }

        return this.normVectorIndex
    }

    async getNormalizationOptions() {
        // Normalization options are computed as a side effect of loading the index.  A bit
        // ugly but alternatives are worse.
        await this.getNormVectorIndex()
        return this.normalizationTypes;
    }

    /**
     * Return a promise to load the normalization vector index
     *
     * @param dataset
     * @param range  -- file range {position, size}
     * @returns Promise for the normalization vector index
     */
    async readNormVectorIndex(range) {

        await this.init()

        this.normalizationVectorIndexRange = range;

        const data = await this.file.read(range.start, range.size)

        const binaryParser = new BinaryParser(new DataView(data));

        this.normVectorIndex = {};

        let nEntries = binaryParser.getInt();
        while (nEntries-- > 0) {
            this.parseNormVectorEntry(binaryParser)
        }

        return this.normVectorIndex;

    }

    /**
     * This function is used when the position of the norm vector index is unknown.  We must read through the expected
     * values to find the index
     *
     * @param dataset
     * @returns {Promise}
     */
    async readNormExpectedValuesAndNormVectorIndex() {

        await this.init()

        if (this.normExpectedValueVectorsPosition === undefined) {
            return;
        }

        const nviStart = await this.skipExpectedValues(this.normExpectedValueVectorsPosition)
        let byteCount = INT;

        let data = await this.file.read(nviStart, INT);
        if (data.byteLength === 0) {
            // This is possible if there are no norm vectors.  Its a legal v8 file, though uncommon
            return;
        }
        const binaryParser = new BinaryParser(new DataView(data));
        const nEntries = binaryParser.getInt();
        const sizeEstimate = nEntries * 30;
        const range = {start: nviStart + byteCount, size: sizeEstimate}

        data = await this.file.read(range.start, range.size)
        this.normalizedExpectedValueVectors = {};
        this.normVectorIndex = {};

        // Recursively process entries
        await processEntries.call(this, nEntries, data)

        this.config.nvi = nviStart.toString() + "," + byteCount

        async function processEntries(nEntries, data) {

            const binaryParser = new BinaryParser(new DataView(data));

            while (nEntries-- > 0) {

                if (binaryParser.available() < 100) {

                    nEntries++;   // Reset counter as entry is not processed

                    byteCount += binaryParser.position;
                    const sizeEstimate = Math.max(1000, nEntries * 30);
                    const range = {start: nviStart + byteCount, size: sizeEstimate}
                    const data = await this.file.read(range.start, range.size)
                    return processEntries.call(this, nEntries, data);
                }

                this.parseNormVectorEntry(binaryParser)

            }
            byteCount += binaryParser.position;
        }
    }

    /**
     * This function is used when the position of the norm vector index is unknown.  We must read through the
     * normalized expected values to find the index
     *
     * @param dataset
     * @returns {Promise}
     */
    async skipExpectedValues(start) {

        const version = this.version;
        const file = new BufferedFile({file: this.file, size: 256000})
        const range = {start: start, size: INT};
        const data = await file.read(range.start, range.size)
        const binaryParser = new BinaryParser(new DataView(data));
        const nEntries = binaryParser.getInt();   // Total # of expected value chunks
        if (nEntries === 0) {
            return start + INT;
        } else {
            return parseNext(start + INT, nEntries);
        }     // Skip 4 bytes for int


        async function parseNext(start, nEntries) {

            let range = {start: start, size: 500}
            let chunkSize = 0
            let p0 = start;

            let data = await file.read(range.start, range.size)
            let binaryParser = new BinaryParser(new DataView(data));
            const type = binaryParser.getString(); // type
            const unit = binaryParser.getString(); // unit
            const binSize = binaryParser.getInt(); // binSize
            const nValues = version < 9 ? binaryParser.getInt() : binaryParser.getLong();

            chunkSize += binaryParser.position + nValues * (version < 9 ? DOUBLE : FLOAT);

            range = {start: start + chunkSize, size: INT};
            data = await file.read(range.start, range.size)
            binaryParser = new BinaryParser(new DataView(data));
            const nChrScaleFactors = binaryParser.getInt();
            chunkSize += (INT + nChrScaleFactors * (INT + (version < 9 ? DOUBLE : FLOAT)));


            nEntries--;
            if (nEntries === 0) {
                return p0 + chunkSize;
            } else {
                return parseNext(p0 + chunkSize, nEntries);
            }
        }
    }

    getZoomIndexForBinSize(binSize, unit) {

        unit = unit || "BP";

        let resolutionArray
        if (unit === "BP") {
            resolutionArray = this.bpResolutions;
        } else if (unit === "FRAG") {
            resolutionArray = this.fragResolutions;
        } else {
            throw new Error("Invalid unit: " + unit);
        }

        for (let i = 0; i < resolutionArray.length; i++) {
            if (resolutionArray[i] === binSize) return i;
        }

        return -1;
    }

    parseNormVectorEntry(binaryParser) {
        const type = binaryParser.getString();      //15
        const chrIdx = binaryParser.getInt();       //4
        const unit = binaryParser.getString();      //3
        const binSize = binaryParser.getInt();      //4
        const filePosition = binaryParser.getLong();  //8
        const sizeInBytes = this.version < 9 ? binaryParser.getInt() : binaryParser.getLong();     //4:8
        const key = type + "_" + chrIdx + "_" + unit + "_" + binSize;
        // TODO -- why does this not work?  NormalizationVector.getNormalizationVectorKey(type, chrIdx, unit, binSize);

        if (!this.normalizationTypes.includes(type)) {
            this.normalizationTypes.push(type);
        }
        this.normVectorIndex[key] = {filePosition: filePosition, size: sizeInBytes};
    }

    getFileChrName(chrAlias) {
        if (this.chrAliasTable.hasOwnProperty(chrAlias)) {
            return this.chrAliasTable[chrAlias]
        } else {
            return chrAlias
        }
    }


    // NOTE sties are not currently used
    // async getSites(chrName) {
    //     let sites = this.fragmentSitesCache[chrName];
    //     if (!sites) {
    //         if (this.fragmentSitesIndex) {
    //             const entry = self.fragmentSitesIndex[chrName];
    //             if (entry && entry.nSites > 0) {
    //                 sites = await this.readSites(entry.position, entry.nSites)
    //                 this.fragmentSitesCache[chrName] = sites;
    //             }
    //         }
    //     }
    //     return sites;
    // }
    //

}


function getNormalizationVectorKey(type, chrIdx, unit, resolution) {
    return type + "_" + chrIdx + "_" + unit + "_" + resolution;
}

function isGoogleDrive(url) {
    return url.indexOf("drive.google.com") >= 0 || url.indexOf("www.googleapis.com/drive") > 0
}

class Block {
    constructor(blockNumber, zoomData, records, idx) {
        this.blockNumber = blockNumber;
        this.zoomData = zoomData;
        this.records = records;
        this.idx = idx
    }
}


class BlockCache {

    constructor() {
        this.resolution = undefined;
        this.map = new LRU(6);
    }

    set(resolution, key, value) {
        if (this.resolution !== resolution) {
            this.map.clear();
        }
        this.resolution = resolution;
        this.map.set(key, value);
    }

    get(resolution, key) {
        return this.resolution === resolution ? this.map.get(key) : undefined;
    }

    has(resolution, key) {
        return this.resolution === resolution && this.map.has(key);
    }
}

function computePercentile(records, p) {
    const counts = records.map(r => r.counts)
    counts.sort(function (a, b) {
        return a - b;
    })
    const idx = Math.floor((p / 100) * records.length);
    return counts[idx];

    // return HICMath.percentile(array, p);
}


export default HicFile;
