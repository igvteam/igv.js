function runBigwigTests() {

    module("BIGWig");

    function createMockObjects(bpPerPixel) {

        igv = igv || {};
        igv.browser = igv.browser || {};
        igv.browser.referenceFrame = {bpPerPixel: bpPerPixel};

    }

    asyncTest("Bigwig meta datay", function () {

        var url = "../test/data/bigWigExample.bw";

        var bwReader = new igv.BWReader(url);

        bwReader.loadHeader(function () {

            ok(bwReader);

            var header = bwReader.header;
            ok(header);

            equal(20093017, bwReader.contentLength);
            equal(4, header.bwVersion);
            equal(10, header.nZoomLevels);
            equal(344, header.chromTreeOffset);
            equal(393, header.fullDataOffset);
            equal(15751049, header.fullIndexOffset);

            // Summary data
            equal(35106705, bwReader.totalSummary.basesCovered);
            equal(0, bwReader.totalSummary.minVal);
            equal(100, bwReader.totalSummary.maxVal);
            equal(77043134252.78125, bwReader.totalSummary.sumSquares);

//            // chrom tree -- values taken from IGV java
            var ctHeader = bwReader.chromTree.header;
            equal(1, ctHeader.blockSize);
            equal(5, ctHeader.keySize);
            equal(8, ctHeader.valSize);
            equal(1, ctHeader.itemCount);

            // chrom lookup  == there's only 1 chromosome in this test file
            var chrName = "chr21";
            var chrIdx = bwReader.chromTree.dictionary[chrName];
            equal(0, chrIdx);


            // Total data count -- note this is the # of "sections", not the # of data points.  Verified with grep
            equal(6857, bwReader.dataCount);

            var type = bwReader.type;
            equal("BigWig", type);

            start();
        });

    });

    asyncTest("R+ Tree", function () {
        var url = "../test/data/bigWigExample.bw";

        var bwReader = new igv.BWReader(url);

        bwReader.loadHeader(function () {

            var offset = bwReader.header.fullIndexOffset;

            bwReader.loadRPTree(offset, function (rpTree) {

                ok(rpTree.rootNode);

                start();
            });
        });
    });


    //   igv.BWSource.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel, continuation) {

    asyncTest("Wig features", function () {

        //chr21:19,146,376-19,193,466
        var url = "../test/data/bigWigExample.bw",
            chr = "chr21",
            bpStart = 19168957,
            bpEnd = 19170640,
            bpPerPixel = 0.5478515625;    // To match iOS unit test

        createMockObjects(bpPerPixel);

        var bWSource = new igv.BWSource(url);

        bWSource.getFeatures(chr, bpStart, bpEnd, function (features) {

            ok(features);

            equal(features.length, 337);   // Verified in iPad app

            start();
        });
    });

    asyncTest("Zoom data", function () {

        //chr21:19,146,376-19,193,466
        var url = "../test/data/bigWigExample.bw",
            chr = "chr21",
            bpStart = 18728264,
            bpEnd = 26996291,
            bpPerPixel = 10765.6611328125;    // To match iOS unit test

        createMockObjects(bpPerPixel);

        var bWSource = new igv.BWSource(url);

        bWSource.getFeatures(chr, bpStart, bpEnd, function (features) {

            ok(features);

            equal(features.length, 324);   // Verified in iPad app

            start();
        });
    });

    asyncTest("Bed features", function () {

        //chr21:19,146,376-19,193,466
        var url = "../test/data/bigBedExample.bb",
            chr = "chr21",
            bpStart = 33031597,
            bpEnd = 33041570,
            bpPerPixel = 0.5;

        createMockObjects(bpPerPixel);

        var bWSource = new igv.BWSource(url);

        bWSource.getFeatures(chr, bpStart, bpEnd, function (features) {

            ok(features);

            equal(features.length, 23);   // Verified in iPad app

            start();
        });
    });


    // Bigbed test chr21:33,031,597-33,041,570  => 14,810 features


}