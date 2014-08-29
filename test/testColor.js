/**
 * Created by turner on 2/24/14.
 */
function runColorTests() {

    test( "GreyScale Test", 1, function() {

        ok(igv.greyScale(45), "grey");
        console.log(igv.greyScale(45));
    });

    test( "RGB Color Test", 1, function() {

        ok(igv.rgbColor(12, 123, 23), "rgb");
        console.log(igv.rgbColor(12, 123, 23));
    });

    test( "Random Grey Color Test", 1, function() {

        ok(igv.randomGrey(128, 255), "random grey");
        console.log(igv.randomGrey(128, 255));
        console.log(igv.randomGrey(128, 255));
        console.log(igv.randomGrey(128, 255));
    });

    test( "Random RGB Color Test", 1, function() {

        ok(igv.randomRGB(128, 255), "random color");
        console.log(igv.randomRGB(128, 255));
        console.log(igv.randomRGB(128, 255));
        console.log(igv.randomRGB(128, 255));
    });

}

