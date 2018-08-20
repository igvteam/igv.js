function runBrowserTests() {

    // Mock objects

    const div = document.createElement("div");

    asyncTest("Test options", function () {

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


    })


}
