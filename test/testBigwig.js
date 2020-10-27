import {createMockObjects} from "./utils/index.js"
import BWSource from "../js/bigwig/bwSource.js";
import BWReader from "../js/bigwig/bwReader.js";
import {assert} from 'chai';

suite("testBigWig", function () {

    createMockObjects();

    const dataURL = "https://data.broadinstitute.org/igvdata/test/data/"

    test("No data", async function () {

        this.timeout(10000);
        const bw = new BWSource(
            {url: dataURL + 'bigwig/manyChromosomes.bigWig'}
        );
        const features = await bw.getFeatures({chr: 'NoSuchChromosome', start: 0, end: 100});
        assert.equal(0, features.length);

    });

    test("Many chromosomes", async function () {

        this.timeout(10000);
        const bw = new BWSource(
            {url: dataURL + 'bigwig/manyChromosomes.bigWig'}
        );

        const features = await bw.getFeatures({chr: 'AluJb', start: 0, end: 100});
        assert.equal(99, features.length);
        features.forEach(function (f) {
            assert.equal("AluJb", f.chr);

        })
    })


    test("Bigwig meta data", async function () {

        this.timeout(10000);

        const url = dataURL + "bigwig/bigWigExample.bw";
        const bwReader = new BWReader({url: url});

        const header = await bwReader.loadHeader();

        assert.ok(header);

        assert.equal(4, header.bwVersion);
        assert.equal(10, header.nZoomLevels);
        assert.equal(344, header.chromTreeOffset);
        assert.equal(393, header.fullDataOffset);
        assert.equal(15751049, header.fullIndexOffset);

        // Summary data
        assert.equal(35106705, bwReader.totalSummary.basesCovered);
        assert.equal(0, bwReader.totalSummary.minVal);
        assert.equal(100, bwReader.totalSummary.maxVal);
        assert.equal(77043134252.78125, bwReader.totalSummary.sumSquares);

//            // chrom tree -- values taken from IGV java
        var ctHeader = bwReader.chromTree.header;
        assert.equal(1, ctHeader.blockSize);
        assert.equal(5, ctHeader.keySize);
        assert.equal(8, ctHeader.valSize);
        assert.equal(1, ctHeader.itemCount);

        // chrom lookup  == there's only 1 chromosome in this test file
        var chrName = "chr21";
        var chrIdx = bwReader.chromTree.chromToID[chrName];
        assert.equal(0, chrIdx);


        // Total data count -- note this is the # of "sections", not the # of data points.  Verified with grep
        assert.equal(6857, bwReader.header.dataCount);

        var type = bwReader.type;
        assert.equal("bigwig", type);

    });

    test("R+ Tree", async function () {

        this.timeout(10000);
        const url = dataURL + "bigwig/bigWigExample.bw";
        const bwReader = new BWReader({url: url});
        const header = await bwReader.loadHeader();
        const offset = header.fullIndexOffset;
        bwReader.loadRPTree(offset).then(function (rpTree) {
            assert.ok(rpTree.rootNode);
        });
    });

    test("Wig features", async function () {

        this.timeout(10000);
        //chr21:19,146,376-19,193,466
        const url = dataURL + "bigwig/bigWigExample.bw",
            chr = "chr21",
            start = 19168957,
            end = 19170640;

        const bWSource = new BWSource({url: url});
        const features = await bWSource.getFeatures({chr: chr, start: start, end: end});
        assert.ok(features);
        assert.equal(features.length, 337);   // Verified in iPad app
    });

    test("Uncompressed bigwig", async function () {

        this.timeout(10000);

        //chr21:19,146,376-19,193,466
        const url = "https://s3.amazonaws.com/igv.org.test/data/uncompressed.bw",
            chr = "chr21",
            start = 0,
            end = Number.MAX_SAFE_INTEGER,
            bpPerPixel = 6191354.824;    // To match iOS unit test

        const bwReader = new BWReader({url: url});
        const features = await bwReader.readFeatures(chr, start, chr, end, bpPerPixel);
        assert.equal(features.length, 8);   // Verified in iPad app

    });

    test("Zoom data", async function () {

        this.timeout(10000);

        //chr21:19,146,376-19,193,466
        const url = dataURL + "bigwig/bigWigExample.bw",
            chr = "chr21",
            start = 18728264,
            end = 26996291,
            bpPerPixel = 10765.6611328125;    // To match iOS unit test
        const bWSource = new BWSource({url: url});
        const features = await bWSource.getFeatures({chr, start, end, bpPerPixel});
        assert.ok(features);
        assert.equal(features.length, 1293);   // Verified in iPad app

    })

})