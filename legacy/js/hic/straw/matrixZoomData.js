import BinaryParser from "./binary.js"


class MatrixZoomData {

    constructor(chr1, chr2) {

        this.chr1 = chr1;    // chromosome index
        this.chr2 = chr2;
    }

    getKey () {
        return this.chr1.name + "_" + this.chr2.name + "_" + this.zoom.unit + "_" + this.zoom.binSize;
    }

    getBlockNumbers(region1, region2, version) {

        // Verify region chromosomes and swap if neccessary
        if(region1.chr == this.chr2 && region2.chr === this.chr1) {
            const tmp = region1;
            region1 = region2;
            region2 = tmp;
        }

        const sameChr = this.chr1 === this.chr2;
        const binsize = this.zoom.binSize;
        const blockBinCount = this.blockBinCount
        const blockColumnCount = this.blockColumnCount
        return (version < 9 || !sameChr) ? getBlockNumbersV8() : getBlockNumbersV9();

        function getBlockNumbersV8()
        {
            const x1 = region1.start / binsize
            const x2 = region1.end / binsize
            const y1 = region2.start / binsize
            const y2 = region2.end / binsize

            const col1 = Math.floor(x1 / blockBinCount)
            const col2 = Math.floor((x2 - 1) / blockBinCount)
            const row1 = Math.floor(y1 / blockBinCount)
            const row2 = Math.floor((y2 - 1) / blockBinCount)

            const blockNumbers = [];
            for (let row = row1; row <= row2; row++) {
                for (let column = col1; column <= col2; column++) {
                    let blockNumber
                    if (sameChr && row < column) {
                        blockNumber = column * blockColumnCount + row;
                    } else {
                        blockNumber = row * blockColumnCount + column;
                    }
                    if (!blockNumbers.includes(blockNumber)) {  // possible from transposition
                        blockNumbers.push(blockNumber)
                    }
                }
            }
            return blockNumbers
        }

        function getBlockNumbersV9()
        {

            const binX1 = region1.start / binsize
            const binX2 = region1.end / binsize
            const binY1 = region2.start / binsize
            const binY2 = region2.end / binsize

            // PAD = positionAlongDiagonal (~projected)
            // Depth is axis perpendicular to diagonal; nearer means closer to diagonal
            const translatedLowerPAD = Math.floor((binX1 + binY1) / 2 / blockBinCount);
            const translatedHigherPAD = Math.floor((binX2 + binY2) / 2 / blockBinCount);
            const translatedNearerDepth = Math.floor(Math.log2(1 + Math.abs(binX1 - binY2) / Math.sqrt(2) / blockBinCount));
            const translatedFurtherDepth = Math.floor(Math.log2(1 + Math.abs(binX2 - binY1) / Math.sqrt(2) / blockBinCount));

            // because code above assume above diagonal; but we could be below diagonal
            const containsDiagonal = (binX2 - binY1) * (binX1 - binY2) < 0;   // i.e. sign of (x-y) opposite on 2 corners
            const nearerDepth = containsDiagonal ? 0 : Math.min(translatedNearerDepth, translatedFurtherDepth);
            const furtherDepth = Math.max(translatedNearerDepth, translatedFurtherDepth);

            const blockNumbers = [];
            for (let depth = nearerDepth; depth <= furtherDepth; depth++) {
                for (let pad = translatedLowerPAD; pad <= translatedHigherPAD; pad++) {
                    const block_number = depth * blockColumnCount + pad;
                    blockNumbers.push(block_number)
                }
            }
            return blockNumbers
        }
    }

    static parseMatrixZoomData(chr1, chr2, dis) {

        const zd = new MatrixZoomData(chr1, chr2);

        const unit = dis.getString();
        const zoomIndex = dis.getInt();
        const sumCounts = dis.getFloat();
        const occupiedCellCount = dis.getFloat();
        const stdDev = dis.getFloat();
        const percent95 = dis.getFloat();
        const binSize = dis.getInt();
        zd. blockBinCount = dis.getInt();
        zd. blockColumnCount = dis.getInt();
        const nBlocks = dis.getInt();

        zd. zoom = {index: zoomIndex, unit: unit, binSize: binSize};

        zd.blockIndex = new StaticBlockIndex(nBlocks, dis);

        const nBins1 = (chr1.size / binSize);
        const nBins2 = (chr2.size / binSize);
        const avgCount = (sumCounts / nBins1) / nBins2;   // <= trying to avoid overflows

        zd.averageCount = avgCount;
        zd.sumCounts = sumCounts;
        zd.stdDev = stdDev;
        zd.occupiedCellCount = occupiedCellCount;
        zd.percent95 = percent95;

        return zd;
    }
}


class StaticBlockIndex {

    constructor(nBlocks, dis) {
        this.blockIndex = {};
        while (nBlocks-- > 0) {
            const blockNumber = dis.getInt();
            const filePosition = dis.getLong();
            const size = dis.getInt();
            this.blockIndex[blockNumber] = {filePosition, size};
        }
    }

    getBlockIndexEntry(blockNumber) {
        return this.blockIndex[blockNumber];
    }
}


/**
 * The dynamic block index looks up entries on-the-fly using a bisecting algorithm.  It was developed for 1bp max
 * resolution files when block grids were square for intra-chromosomes  (format v8).   The rotated non-square grid
 * used for v9 makes this obsolete.
 */
class DynamicBlockIndex {

    constructor({file, position, nBlocks, maxBlock}) {
        this.file = file;
        this.minPosition = position;
        this.maxPosition = position + nBlocks * 16;
        this.nBlocks = nBlocks;
        this.maxBlock = maxBlock;
    }

    async getBlockIndexEntry(blockNumber) {
        if (blockNumber > this.maxBlock) {
            return undefined;
        } else if (this.blockNumberRange && blockNumber >= this.blockNumberRange.first && blockNumber <= this.blockNumberRange.last) {
            return this.blockIndexMap[blockNumber];
        } else {
            let minPosition = this.minPosition;
            let maxPosition = this.maxPosition;
            if (this.blockNumberRange && this.mapFileBounds) {
                if (blockNumber < this.blockNumberRange.first) {
                    maxPosition = this.mapFileBounds.min;
                } else if (blockNumber > this.blockNumberRange.last) {
                    minPosition = this.mapFileBounds.max;
                }
            }
            if (maxPosition - minPosition < 16) {
                return undefined;
            } else {
                return this.searchForBlockIndexEntry(blockNumber, minPosition, maxPosition);
            }
        }
    }


    // Search entry for blockNumber between file positions boundsMin and boundsMax
    // boundsMin is guaranteed to start at the beginning of an entry, boundsMax at the end
    async searchForBlockIndexEntry(blockNumber, boundsMin, boundsMax) {

//        console.log(`${blockNumber}  ${boundsMin}  ${boundsMax}`)
        const chunkSize = 16 * 100000;
        if (boundsMax - boundsMin < chunkSize) {
            const data = await this.file.read(boundsMin, boundsMax - boundsMin);
            const dis = new BinaryParser(new DataView(data));
            const blockIndex = {};
            let ptr = boundsMin;
            let firstBlockNumber, lastBlockNumber;
            while (ptr < boundsMax) {
                const bn = dis.getInt();
                const filePosition = dis.getLong();
                const blockSizeInBytes = dis.getInt();
                blockIndex[bn] = {filePosition: filePosition, size: blockSizeInBytes};
                if (firstBlockNumber === undefined) firstBlockNumber = bn;
                lastBlockNumber = bn;
                ptr += 16;
            }
            this.mapFileBounds = {min: boundsMin, max: boundsMax};
            this.blockNumberRange = {first: firstBlockNumber, last: lastBlockNumber};
            this.blockIndexMap = blockIndex;
            return blockIndex[blockNumber];

        }
        // Midpoint in units of 16 byte chunks
        const nEntries = (boundsMax - boundsMin) / 16;
        const pos1 = boundsMin + Math.floor(nEntries / 2) * 16;
        const data = await this.file.read(pos1, 16);
        const dis = new BinaryParser(new DataView(data));
        const bn = dis.getInt();
        if (bn === blockNumber) {
            const filePosition = dis.getLong();
            const blockSizeInBytes = dis.getInt();
            return {filePosition: filePosition, size: blockSizeInBytes}   // Extraordinarily lucky
        } else if (blockNumber > bn) {
            const bie = await this.searchForBlockIndexEntry(blockNumber, pos1 + 16, boundsMax);
            return bie;
        } else {
            const bie = await this.searchForBlockIndexEntry(blockNumber, boundsMin, pos1);
            return bie;
        }
    }
}



export default MatrixZoomData;