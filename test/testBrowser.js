function runBrowserTests() {

    // Mock objects

    const div = document.createElement("div");

    // asyncTest("Test navigation option", function () {
    //
    //     const options = {
    //         genome: "hg19",
    //         showNavigation: false
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
    //
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

        // Create 100 browsers, then remove them 1 at a time;


        const browsers = [];

        const promises = [];

        for (let i = 0; i < 100; i++) {
            promises.push(igv.createBrowser(div, {
                genome: "hg19",
                showRuler: false
            }));
        }

        Promise.all(promises)
            .then(function (browsers) {

                browsers.forEach(function (b) {
                    igv.removeBrowser(b);
                })

                ok(true);

                start();

            })
                .catch(function (error) {
                    ok(false);
                    console.log(error);
                    start();
                })

    })


}
