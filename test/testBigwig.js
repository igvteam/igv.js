import BWSource from "../js/bigwig/bwSource.js";
import BWReader from "../js/bigwig/bwReader.js";

function runBigwigTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/"

    function createMockObjects(bpPerPixel) {

        // igv.browser = igv.browser || {};
        // igv.browser.referenceFrame = {bpPerPixel: bpPerPixel};

    }

    QUnit.test("No data", function (assert) {
        var done = assert.async();

        var bw = new BWSource(
            {url: dataURL + 'bigwig/manyChromosomes.bigWig'}
        );

        bw.getFeatures('NoSuchChromosome', 0, 100)
            .then(function (features) {
                assert.equal(0, features.length);
                done();
            })

            .catch(function (error) {
                console.log(Error('query bigWig error: ') + error);
                assert.ok(false);
            });
    });

    QUnit.test("Many chromosomes", function (assert) {
        var done = assert.async();

        var bw = new BWSource(
            {url: dataURL + 'bigwig/manyChromosomes.bigWig'}
        );

        bw.getFeatures('AluJb', 0, 100)
            .then(function (features) {
                assert.equal(99, features.length);
                features.forEach(function (f) {
                    assert.equal("AluJb", f.chr);
                });

                done();
            })

            .catch(function (error) {
                console.log(Error('query bigWig error: ') + error);
                assert.ok(false);
            });
    });


    QUnit.test("Bigwig meta data", function (assert) {
        var done = assert.async();

        var url = dataURL + "bigwig/bigWigExample.bw",
            bwReader;

        createMockObjects();

        bwReader = new BWReader({url: url});
        assert.ok(bwReader);

        bwReader.loadHeader().then(function () {

            var header = bwReader.header;

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
            assert.equal("BigWig", type);

            done();
        }).catch(function (error) {
            console.log(error);
        });
    });

    QUnit.test("R+ Tree", function (assert) {
        var done = assert.async();

        createMockObjects();

        var url = dataURL + "bigwig/bigWigExample.bw",
            bwReader = new BWReader({url: url});

        bwReader.loadHeader().then(function () {

            var offset = bwReader.header.fullIndexOffset;

            bwReader.loadRPTree(offset).then(function (rpTree) {

                assert.ok(rpTree.rootNode);

                done();
            });
        }).catch(function (error) {
            console.log(error);
            assert.ok(false);
        });
    });

    QUnit.test("Wig features", function (assert) {
        var done = assert.async();

        //chr21:19,146,376-19,193,466
        var url = dataURL + "bigwig/bigWigExample.bw",
            chr = "chr21",
            bpStart = 19168957,
            bpEnd = 19170640,
            bpPerPixel = 0.5478515625;    // To match iOS unit test

        createMockObjects(bpPerPixel);

        var bWSource = new BWSource({url: url});

        bWSource.getFeatures(chr, bpStart, bpEnd).then(function (features) {

            assert.ok(features);

            assert.equal(features.length, 337);   // Verified in iPad app

            done();
        }).catch(function (error) {
            console.log(error);
            assert.ok(false);
        });
    });

    QUnit.test("Uncompressed bigwig", function (assert) {
        var done = assert.async();

        //chr21:19,146,376-19,193,466
        var url =  "https://s3.amazonaws.com/igv.org.test/data/uncompressed.bw",
            chr = "chr21",
            bpStart = 0,
            bpEnd = Number.MAX_SAFE_INTEGER,
            bpPerPixel = 6191354.824;    // To match iOS unit test

        createMockObjects(bpPerPixel);

        var bwReader = new BWReader({url: url});

        bwReader.readFeatures(chr, bpStart, chr, bpEnd, bpPerPixel).then(function (features) {

            assert.ok(features);

            assert.equal(features.length, 8);   // Verified in iPad app

            done();
        }).catch(function (error) {
            console.log(error);
            assert.ok(false);
        });
    });

    QUnit.test("Zoom data", function (assert) {
        var done = assert.async();

        //chr21:19,146,376-19,193,466
        var url = dataURL + "bigwig/bigWigExample.bw",
            chr = "chr21",
            bpStart = 18728264,
            bpEnd = 26996291,
            bpPerPixel = 10765.6611328125;    // To match iOS unit test

        createMockObjects(bpPerPixel);

        var bWSource = new BWSource({url: url});

        bWSource.getFeatures(chr, bpStart, bpEnd, bpPerPixel)
            .then(function (features) {

                assert.ok(features);

                assert.equal(features.length, 1293);   // Verified in iPad app

                done();
            }).catch(function (error) {
            console.log(error);
            assert.ok(false);
        })
    });

}

export default runBigwigTests;