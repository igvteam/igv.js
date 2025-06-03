import "./utils/mockObjects.js"
import {assert} from 'chai'
import ChromTree from "../src/igvCore/bigwig/chromTree.js"

suite("test bbChromTree", function () {

    test("ID to name lookup", async function () {

        this.timeout(10000)

        const url = "test/data/bb/cytoBandMapped.bb"
        const bbChromTree = new ChromTree(url, {}, 757 )
        await bbChromTree.init()
        assert.equal(bbChromTree.getItemCount(), 24)

        const chrID = await bbChromTree.getIdForName("chr10");
        const chrName = await bbChromTree.getNameForId(chrID);
        assert.equal("chr10", chrName);

    })


    test("clinvar", async function () {

        this.timeout(10000)
        const url = "https://hgdownload.soe.ucsc.edu/gbdb/hg38/bbi/clinvar/clinvarMain.bb"
        const bbChromTree = new ChromTree(url, {}, 3102 )
        await bbChromTree.init()
        assert.equal(bbChromTree.getItemCount(), 27)
    })

    /**
     * Test a BB file with a small large chrom tree (24 contigs).  The estimate should be the exact size.
     */
    test("Larenome size estimate", async function () {

        this.timeout(10000)
        const url = "https://hgdownload.soe.ucsc.edu/gbdb/hs1/ncbiRefSeq/ncbiRefSeqCurated.bb"
        const bbChromTree = new ChromTree(url, {}, 1752 )
        await bbChromTree.init()
        assert.equal(bbChromTree.getItemCount(), 24)
        const estSize = await bbChromTree.estimateGenomeSize();
        const ratio =  estSize / 5335596728;
        assert.ok(ratio > 0.05 && ratio < 20);

    })

    /**
     * Test a BB file with a very large chrom tree (> 7 million contigs).  The main point of this test is to insure
     * the calculation of the estimated genome size works.  The accuracy of the estimate is not crucial, the main
     * point is to test the function returns in reasonable time
     * Actual size = 5335596729
     */
    test("Large genome size estimate", async function () {

        this.timeout(10000)
        const url = "https://hgdownload.soe.ucsc.edu/hubs/GCA/004/027/955/GCA_004027955.1/GCA_004027955.1.chromAlias.bb"
        const bbChromTree = new ChromTree(url, {}, 738 )
        await bbChromTree.init()
        assert.equal(bbChromTree.getItemCount(), 7677333)
        const time = Date.now()
        const estSize = await bbChromTree.estimateGenomeSize();
        const dt = Date.now() - time
        assert.ok(dt < 10000, "Estimate took too long: " + dt);

    })

})
