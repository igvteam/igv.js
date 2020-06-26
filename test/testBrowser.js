import {createBrowser, removeBrowser} from "../js/igv-create.js";

function runBrowserTests() {

    // Mock objects

    const div = document.createElement("div");

    QUnit.test("Test navigation option", function (assert) {
        var done = assert.async();

        const options = {
            genome: "hg19",
            showNavigation: false
        };

        createBrowser(div, options)
            .then(function (browser) {
                assert.ok(browser);
                done();
            })

            .catch(function (error) {
                assert.ok(false);
                console.log(error);
                done();
            })
    });

    QUnit.test("Test ruler option", function (assert) {

        var done = assert.async();

        const options = {
            genome: "hg19",
            showRuler: false
        };

        createBrowser(div, options)
            .then(function (browser) {
                assert.ok(browser);
                done();
            })

            .catch(function (error) {
                assert.ok(false);
                console.log(error);
                done();
            })
    });


    QUnit.test("Test remove browser", function (assert) {
        var done = assert.async();

        // Create and remove "n" browsers.

        const n = 5;
        let i = 0;

        createRemove();

        function createRemove() {

            createBrowser(div, {
                genome: "hg19",
                locus: "myc"
            })
                .then(function (browser) {

                    removeBrowser(browser);
                    if (i++ < 10) {
                        createRemove();
                    } else {
                        assert.ok(true);
                        done();
                    }


                })
                .catch(function (error) {
                    console.error(error);
                    assert.ok(false);
                    done();
                })
        }
    })

    QUnit.test("Test custom Ensembl search backend", function (assert) {
        var done = assert.async();
        // The Ensembl REST API for symbol lookup (https://rest.ensembl.org/documentation/info/symbol_lookup)
        // enables searching genes for a wider array of organisms than those supported by default
        // in https://igv.org/genomes/locus.php.
        //
        // This tests handling for the Ensembl lookup API as a custom igv.js search backend.
        //
        // The example below uses a human reference, to avoid complexity around also mocking support
        // for custom reference genomes.  The search itself uses  crab-eating macaque (Macaca
        // fascicularis) -- the original motivation to support a custom Ensembl search backend.
        // In real-world examples, the `genome` would use a custom reference for Macaca fascicularis.

        createBrowser(div, {
            genome: "hg19",
            locus: "myc",
            search: {
                url: 'https://rest.ensembl.org/lookup/symbol/macaca_fascicularis/$FEATURE$?content-type=application/json',
                chromosomeField: 'seq_region_name',
                displayName: 'display_name'
            }
        })
        .then(function (browser) {

            browser.search('BRCA2').then(function (genomicState) {
                // console.log('genomicState')
                // console.log(JSON.stringify(genomicState))

                assert.equal(genomicState[0].chromosome.name, 'chr17');
                assert.equal(genomicState[0].start, 11863385);
                assert.equal(genomicState[0].end, 11957305);
                done();
            })
        })
        .catch(function (error) {
            console.error(error);
            assert.ok(false);
            done();
        })
    })
}

export default runBrowserTests;
