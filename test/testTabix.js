import loadCsiIndex from "../js/bam/csiIndex.js";
import loadBamIndex from "../js/bam/bamIndex.js";
import {unbgzf} from "../js/bam/bgzf.js";
import igvxhr from "../js/igvxhr.js";
import FeatureFileReader from "../js/feature/featureFileReader.js";

function runTabixTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/"


    QUnit.test("blocksForRange", function (assert) {
        var done = assert.async();

        var refID = 14,
            beg = 24375199,
            end = 24378544,
            indexPath = dataURL + "tabix/TSVC.vcf.gz.tbi",
            config = {};

        loadBamIndex(indexPath, config, true).then(function (bamIndex) {
            assert.ok(bamIndex);
            done();
        }).catch(function (error) {
            assert.ok(false);
            console.log(error);
            done();
        });
    });

    QUnit.test("bgzip", async function (assert) {
        var done = assert.async();
        const url = "data/bed/missing_linefeed.bed.gz"
        const data = await igvxhr.load(url,
            {
                responseType: "arraybuffer",
            })
        const result = unbgzf(data)
        assert.ok(result)
        done()
    })

    QUnit.test("CSI", async function (assert) {

        var refID = 0,
            beg = 1226000,
            end = 1227000,
            indexPath = "data/tabix/csi-test.vcf.gz.csi",
            config = {};

        const csiIndex = await loadCsiIndex(indexPath, config, true);
        assert.ok(csiIndex);

        const blocks = csiIndex.blocksForRange(refID, beg, end);
        assert.ok(blocks.length > 0)

    });

    QUnit.test("CSI query", async function (assert) {

        var chr = "chr1",
            beg = 1226000,
            end = 1227000;

        const reader = new FeatureFileReader({
            format: "vcf",
            url: "data/tabix/csi-test.vcf.gz",
            indexURL:"data/tabix/csi-test.vcf.gz.csi"
        });
        await reader.readHeader();
        const features = await reader.readFeatures(chr, beg, end);
        assert.ok(features);

        // Verify features are in query range.  The first feature before and after query range are returned by design
        const len = features.length;
        for(let i=1; i<len-1; i++) {
            const f = features[i];
            assert.ok(f.chr === chr && f.end >= beg && f.start <= end);
        }

    });



}

export default runTabixTests;



