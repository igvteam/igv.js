import "./utils/mockObjects.js"
import {assert} from 'chai';
import {genome} from "./utils/Genome.js";
import {macacaGenome} from "./utils/MacacaGenome.js";
import {parseLocusString, searchWebService} from "../js/search.js";
import search from "../js/search.js";

suite("testSearch", function () {

    genome.featureDB =  {
        "MUC1": {chr: "chr1", start: 155185820, end: 155192900}, // coords are off on purpose, for test
        "FOO BAR": {chr: "chrX", start: 1, end: 2}   // for testing feature names with spaces
    }

    const browser = {
        genome: genome,
        searchConfig : {
            type: "plain",
            url: 'https://igv.org/genomes/locus.php?genome=$GENOME$&name=$FEATURE$',
            coords: 0,
            chromosomeField: "chromosome",
            startField: "start",
            endField: "end",
            geneField: "gene",
            snpField: "snp"
        },
    }

    test("locus strings", function () {
        const s1 = "chr1:100-200";
        const locus1 = parseLocusString(browser, s1);
        assert.equal(locus1.chr, "chr1");
        assert.equal(locus1.start, 99);
        assert.equal(locus1.end, 200);

        // Chr name alias
        const s2 = "1:100-200";
        const locus2 = parseLocusString(browser, s2);
        assert.equal(locus2.chr, "chr1");
        assert.equal(locus2.start, 99);
        assert.equal(locus2.end, 200);

        // Single base
        const s3 = "1:100";
        const locus3 = parseLocusString(browser, s3);
        assert.equal(locus3.chr, "chr1");
        assert.equal(locus3.start, 79);
        assert.equal(locus3.end, 120);

        const s4 = "egfr";
        const locus4 = parseLocusString(browser, s4);
        assert.equal(locus4, undefined);
    })

    test("webservice", async function () {

        this.timeout(10000);

        // myc =>  chr8:127,735,434-127,742,951 (+), chr8:127,736,231-127,742,951 (+)
        const gene = "myc";
        const locus = await searchWebService(browser, gene, browser.searchConfig);
        assert.equal(locus.chr, "chr8");
        assert.equal(locus.start, 127735432);
        assert.equal(locus.end, 127742951);
        assert.equal(locus.locusSearchString, gene);
    });

    test("search (main function)", async function () {

        this.timeout(10000);

        const s1 = "chr1:100-200";
        const s2 = "myc";
        const s3 = "muc1";

        const results = await search(browser, `${s1} ${s2} ${s3}`);

        const locus1 = results[0];
        assert.equal(locus1.chr, "chr1");
        assert.equal(locus1.start, 99);
        assert.equal(locus1.end, 200);
        assert.equal(locus1.locusSearchString, s1);

        const locus2 = results[1];
        assert.equal(locus2.chr, "chr8");
        assert.equal(locus2.start, 127735432);
        assert.equal(locus2.end, 127742951);
        assert.equal(locus2.locusSearchString, s2);

        const locus3 = results[2];
        assert.equal(locus3.chr, "chr1");
        assert.equal(locus3.start, 155185820);
        assert.equal(locus3.end, 155192900);
        assert.equal(locus3.locusSearchString, s3);
    })

    test("search with spaces", async function () {


        const s4 = "foo bar";

        const results = await search(browser, s4);

        const locus4 = results[0];
        assert.equal(locus4.chr, "chrX");
        assert.equal(locus4.start, 1);
        assert.equal(locus4.end, 2);

    })


    test("custom webservice", async function () {

        this.timeout(10000);

        browser.genome = macacaGenome;
        browser.searchConfig = {
            url: 'https://rest.ensembl.org/lookup/symbol/macaca_fascicularis/$FEATURE$?content-type=application/json',
            chromosomeField: 'seq_region_name',
            displayName: 'display_name'
        }

        // olig3 => 4:41,813,339-41,814,160
        const gene = "olig3";
        const locus = await searchWebService(browser, gene, browser.searchConfig);
        assert.equal(locus.chr, "4");
        assert.equal(locus.start, 41813338);
        assert.equal(locus.end, 41814160);
    });


})

