import "./utils/mockObjects.js"
import {assert} from 'chai';
import HtsgetReader from "../js/bam/htsgetReader.js";


suite("testBAM", async function () {

    /**
     * Minimal test of htsget -- just verifies that something parsable as a BAM record is returned.
     */
    test("GIAB NA12878", async function () {

        this.timeout(10000);

        const id = 'giab.NA12878.NIST7086.1',
            chr = 'chr1',
            s = 10000,
            end = 10100;

        const trackConfig = {
            url: 'https://htsget.ga4gh.org',
            endpoint: '/reads/',
            id: id
        }

        const reader = new HtsgetReader(trackConfig);
        const alignmentContainer = await reader.readAlignments(chr, s, end);

        assert.ok(alignmentContainer);
        assert.ok(alignmentContainer.alignments.length > 0);

    })
})

