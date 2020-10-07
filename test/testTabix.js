import {loadIndex} from "../js/bam/indexFactory.js";
import {unbgzf} from "../js/bam/bgzf.js";
import igvxhr from "../js/igvxhr.js";
import FeatureFileReader from "../js/feature/featureFileReader.js";
import {assert} from 'chai';
import {createMockObjects} from "@igvteam/test-utils/src"


suite("testTabix", function () {

    createMockObjects();

    test("bgzip", async function () {
        const url = require.resolve("./data/bed/missing_linefeed.bed.gz");
        const data = await igvxhr.load(url,
            {
                responseType: "arraybuffer",
            })
        const result = unbgzf(data)
        assert.ok(result)
    })

    test("CSI", async function () {

        const refID = 0,
            beg = 1226000,
            end = 1227000,
            indexPath = require.resolve("./data/tabix/csi-test.vcf.gz.csi"),
            config = {};

        const csiIndex = await loadIndex(indexPath, config);
        assert.ok(csiIndex);

        const blocks = csiIndex.blocksForRange(refID, beg, end);
        assert.ok(blocks.length > 0)

    })

    test("CSI query", async function () {

        const chr = "chr1",
            beg = 1226000,
            end = 1227000;

        const reader = new FeatureFileReader({
            format: "vcf",
            url: require.resolve("./data/tabix/csi-test.vcf.gz"),
            indexURL: require.resolve("./data/tabix/csi-test.vcf.gz.csi")
        });
        await reader.readHeader();
        const {features} = await reader.readFeatures(chr, beg, end);
        assert.ok(features);

        // Verify features are in query range.  The features immediately before and after query range are returned by design
        const len = features.length;
        assert.ok(len > 0);
        for (let i = 1; i < len - 1; i++) {
            const f = features[i];
            assert.ok(f.chr === chr && f.end >= beg && f.start <= end);
        }
    })
})



