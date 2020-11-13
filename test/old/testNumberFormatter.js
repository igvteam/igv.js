/**
 * Created by turner on 2/24/14.
 */
function runNumberFormatterTests() {

    test("Number Formatter Test", 8, function () {

        equal("1", igv.numberFormatter("1"));
        equal("10", igv.numberFormatter("10"));
        equal("100", igv.numberFormatter("100"));
        equal("1,000", igv.numberFormatter("1000"));
        equal("10,000", igv.numberFormatter("10000"));
        equal("100,000", igv.numberFormatter("100000"));
        equal("1,000,000", igv.numberFormatter("1000000"));
        equal("10,000,000", igv.numberFormatter("10000000"));

    });

    test("Number Unformatter Test", 3, function () {

        equal("999", igv.numberUnFormatter("999"));
        equal("9999", igv.numberUnFormatter("9,999"));
        equal("99999", igv.numberUnFormatter("99,999"));

    });

}
