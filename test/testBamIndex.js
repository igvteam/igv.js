function runBAMIndexTests() {


    asyncTest("blocksForRange", function () {

        var refID = 14,
            beg = 24375199,
            end = 24378544,
            url = 'data/bam/gstt1_sample.bam',
            indexPath = url + ".bai",
            config;

        config = {
            type: 'bam',
            url: url

        };

        igv.loadBamIndex(indexPath, config, function (bamIndex) {

            chunks = bamIndex.blocksForRange(refID, beg, end);

            ok(chunks, "chunks are non-null");
            equal(chunks.length, 1, "chunks.length is correct");

            var chunk = chunks[0];
            equal(0, chunk.maxv.offset, "chunk.maxv.offset");
            equal(60872, chunk.maxv.block, "chunk.maxv.block");

            start();

        }, undefined);
    });

    asyncTest("blocksForRange 1kg", function () {

        var refID = 0,
            beg = 155168191,
            end = 155170311,
            url = 'http://www.broadinstitute.org/igvdata/1KG/b37/data/HG02450/alignment/HG02450.mapped.ILLUMINA.bwa.ACB.low_coverage.20120522.bam',
            indexPath = url + ".bai",
            config;

        config = {
            type: 'bam',
            url: url

        };

        igv.loadBamIndex(indexPath, config, function (bamIndex) {

            var chunks = bamIndex.blocksForRange(refID, beg, end);
            ok(chunks, "chunks are non-null");
            equal(chunks.length, 6, "chunks.length is correct");

            var chunk = chunks[0];
            equal(34768, chunk.minv.offset);
            equal(884732468, chunk.minv.block);

            equal(47405, chunk.maxv.offset);
            equal(884831373, chunk.maxv.block);

            chunk = chunks[5];
            equal(33278, chunk.minv.offset);
            equal(1082533645, chunk.minv.block);

            equal(36171, chunk.maxv.offset);
            equal(1082533645, chunk.maxv.block);

            start();

        }, undefined);
    });


}



