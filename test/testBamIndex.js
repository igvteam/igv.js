import loadBamIndex from "../js/bam/bamIndex.js";

function runBAMIndexTests() {
    // QUnit.test("blocksForRange", function (assert) {
    //
    //     var refID = 14,
    //         beg = 24375199,
    //         end = 24378544,
    //         url =  dataURL + 'bam/gstt1_sample.bam',
    //         indexPath = url + ".bai",
    //         config;
    //
    //     config = {
    //         type: 'bam',
    //         url: url
    //
    //     };
    //
    //     igv.loadBamIndex(indexPath, config).then(function (bamIndex) {
    //
    //         chunks = bamIndex.blocksForRange(refID, beg, end);
    //
    //         assert.ok(chunks, "chunks are non-null");
    //         assert.equal(chunks.length, 1, "chunks.length is correct");
    //
    //         var chunk = chunks[0];
    //         assert.equal(0, chunk.maxv.offset, "chunk.maxv.offset");
    //         assert.equal(60872, chunk.maxv.block, "chunk.maxv.block");
    //
    //         done();
    //
    //     });
    // });

    QUnit.test("loadIndex", function (assert) {
        var done = assert.async();
        var url = "https://1000genomes.s3.amazonaws.com/phase3/data/HG01879/alignment/HG01879.mapped.ILLUMINA.bwa.ACB.low_coverage.20120522.bam.bai";
        loadBamIndex(url, {}, false).then(function (bamIndex){
            assert.ok(bamIndex);
            done();
        });
    })
}

export default runBAMIndexTests;

