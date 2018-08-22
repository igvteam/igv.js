function runBrowserTests() {

    // Mock objects

    const div = document.createElement("div");

    asyncTest("Test navigation option", function () {

        const options = {
            genome: "hg19",
            showNavigation: false
        };

        igv.createBrowser(div, options)
            .then(function (browser) {
                ok(browser);
                start();
            })

            .catch(function (error) {
                ok(false);
                console.log(error);
                start();
            })
    });

    // asyncTest("Test ruler option", function () {
    //
    //     const options = {
    //         genome: "hg19",
    //         showRuler: false
    //     };
    //
    //     igv.createBrowser(div, options)
    //         .then(function (browser) {
    //             ok(browser);
    //             start();
    //         })
    //
    //         .catch(function (error) {
    //             ok(false);
    //             console.log(error);
    //             start();
    //         })
    // });


    asyncTest("Test remove browser", function () {

        // Create and remove "n" browsers.

        const n = 10;
        let i =0;

        createRemove();

        function createRemove() {

            igv.createBrowser(div, {
                genome: "hg19",
                showRuler: false
            })
                .then(function (browser) {
                    igv.removeBrowser(browser);
                    if(i++ < 10) {
                        createRemove();
                    } else {
                        ok(true);
                        start();
                    }

                })
                .catch(function (error) {
                    console.error(error);
                    ok(false);
                    start();
                })
        }



    })


}
