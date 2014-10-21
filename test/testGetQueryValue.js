/**
 * Created by turner on 10/16/14.
 */
function runGetQueryValueTests() {

    test("Test Get Query value", 1, function() {

        var value;
        value = igv.getQueryValue('session');

        equal(value, "testSession.txt");

    });

}