function runBrowserTests() {

    // Mock objects

    const div = document.createElement("div");

    QUnit.test("Test navigation option", function (assert) {
        var done = assert.async();

        const options = {
            genome: "hg19",
            showNavigation: false
        };

        igv.createBrowser(div, options)
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

        igv.createBrowser(div, options)
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

            igv.createBrowser(div, {
                genome: "hg19",
                locus: "myc"
            })
                .then(function (browser) {

                    igv.removeBrowser(browser);
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


}
