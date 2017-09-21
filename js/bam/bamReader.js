// Represents a BAM file.
// Code is based heavily on bam.js, part of the Dalliance Genome Explorer,  (c) Thomas Down 2006-2001.

var igv = (function (igv) {


    const MAX_GZIP_BLOCK_SIZE = 65536;   //  APPARENTLY.  Where is this documented???
    const DEFAULT_SAMPLING_WINDOW_SIZE = 100;
    const DEFAULT_SAMPLING_DEPTH = 50;
    const MAXIMUM_SAMPLING_DEPTH = 2500;

    /**
     * Class for reading a bam file
     *
     * @param config
     * @constructor
     */
    igv.BamReader = function (config) {

        this.config = config;

        this.filter = config.filter || new igv.BamFilter();

        this.bamPath = config.url;

        // Todo - deal with Picard convention.  WHY DOES THERE HAVE TO BE 2?
        this.baiPath = config.indexURL || igv.inferIndexPath(this.bamPath, "bai"); // If there is an indexURL provided, use it!
        this.headPath = config.headURL || this.bamPath;


        this.samplingWindowSize = config.samplingWindowSize === undefined ? DEFAULT_SAMPLING_WINDOW_SIZE : config.samplingWindowSize;
        this.samplingDepth = config.samplingDepth === undefined ? DEFAULT_SAMPLING_DEPTH : config.samplingDepth;
        if (this.samplingDepth > MAXIMUM_SAMPLING_DEPTH) {
            igv.log("Warning: attempt to set sampling depth > maximum value of 2500");
            this.samplingDepth = MAXIMUM_SAMPLING_DEPTH;
        }

        if (config.viewAsPairs) {
            this.pairsSupported = true;
        }
        else {
            this.pairsSupported = config.pairsSupported === undefined ? true : config.pairsSupported;
        }

    };

    igv.BamReader.prototype.readAlignments = function (chr, bpStart, bpEnd) {

        var self = this;

        return new Promise(function (fulfill, reject) {

            getChrIndex(self)
                .then(function (chrToIndex) {

                    var chrId = chrToIndex[chr],

                        alignmentContainer = new igv.AlignmentContainer(chr, bpStart, bpEnd, self.samplingWindowSize, self.samplingDepth, self.pairsSupported);

                    if (chrId === undefined) {
                        fulfill(alignmentContainer);
                    } else {

                        getIndex(self)
                            .then(function (bamIndex) {

                                var chunks = bamIndex.blocksForRange(chrId, bpStart, bpEnd),
                                    promises = [];


                                if (!chunks) {
                                    fulfill(null);
                                    reject("Error reading bam index");
                                    return;
                                }
                                if (chunks.length === 0) {
                                    fulfill(alignmentContainer);
                                    return;
                                }

                                chunks.forEach(function (c) {

                                    promises.push(new Promise(function (fulfill, reject) {

                                        var fetchMin = c.minv.block,
                                            fetchMax = c.maxv.block + 65000,   // Make sure we get the whole block.
                                            range = {start: fetchMin, size: fetchMax - fetchMin + 1};

                                        igv.xhr.loadArrayBuffer(self.bamPath, igv.buildOptions(self.config, {range: range}))
                                            .then(function (compressed) {

                                            var ba = new Uint8Array(igv.unbgzf(compressed)); //new Uint8Array(igv.unbgzf(compressed)); //, c.maxv.block - c.minv.block + 1));
                                            igv.BamUtils.decodeBamRecords(ba, c.minv.offset, alignmentContainer, bpStart, bpEnd, chrId, self.indexToChr[chrId], self.filter);

                                            fulfill(alignmentContainer);

                                        }).catch(function (obj) {
                                            reject(obj);
                                        });

                                    }))
                                });


                                Promise.all(promises).then(function (ignored) {
                                    alignmentContainer.finish();
                                    fulfill(alignmentContainer);
                                }).catch(function (obj) {
                                    reject(obj);
                                });
                            }).catch(reject);
                    }
                }).catch(reject);
        });

    }

    igv.BamReader.prototype.readHeader = function () {

        var self = this;

        return new Promise(function (fulfill, reject) {

            getIndex(self).then(function (index) {

                var len = index.firstAlignmentBlock + MAX_GZIP_BLOCK_SIZE;   // Insure we get the complete compressed block containing the header

                igv.xhr.loadArrayBuffer(self.bamPath, igv.buildOptions(self.config, {range: {start: 0, size: len}})
                    ).then(function (compressedBuffer) {

                    var unc = igv.unbgzf(compressedBuffer, len),
                        uncba = new Uint8Array(unc),
                        magic = readInt(uncba, 0),
                        samHeaderLen = readInt(uncba, 4),
                        samHeader = '',
                        genome = igv.browser ? igv.browser.genome : null;

                    for (var i = 0; i < samHeaderLen; ++i) {
                        samHeader += String.fromCharCode(uncba[i + 8]);
                    }

                    var nRef = readInt(uncba, samHeaderLen + 8);
                    var p = samHeaderLen + 12;

                    self.chrToIndex = {};
                    self.indexToChr = [];
                    for (var i = 0; i < nRef; ++i) {
                        var lName = readInt(uncba, p);
                        var name = '';
                        for (var j = 0; j < lName - 1; ++j) {
                            name += String.fromCharCode(uncba[p + 4 + j]);
                        }
                        var lRef = readInt(uncba, p + lName + 4);
                        //dlog(name + ': ' + lRef);

                        if (genome && genome.getChromosomeName) {
                            name = genome.getChromosomeName(name);
                        }

                        self.chrToIndex[name] = i;
                        self.indexToChr.push(name);

                        p = p + 8 + lName;
                    }

                    fulfill();

                }).catch(reject);
            }).catch(reject);
        });
    }

//
    function getIndex(bam) {

        return new Promise(function (fulfill, reject) {

            if (bam.index) {
                fulfill(bam.index);
            } else {
                igv
                    .loadBamIndex(bam.baiPath, bam.config)
                    .then(function (index) {
                        bam.index = index;
                        fulfill(bam.index);
                    })
                    .catch(reject);
            }
        });
    }


    function getChrIndex(bam) {

        return new Promise(function (fulfill, reject) {

            if (bam.chrToIndex) {
                fulfill(bam.chrToIndex);
            }
            else {
                bam.readHeader().then(function () {
                    fulfill(bam.chrToIndex);
                }).catch(reject);
            }
        });
    }

    function readInt(ba, offset) {
        return (ba[offset + 3] << 24) | (ba[offset + 2] << 16) | (ba[offset + 1] << 8) | (ba[offset]);
    }

    return igv;

})
(igv || {});


