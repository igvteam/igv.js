/**
 * Created by turner on 2/17/14.
 */
/**
 * Created by turner on 2/14/14.
 */
function runParseUtilsTests() {

    test("Parse Utils isBlank", 1, function () {

        var result = igv.isBlank(" ");
        ok(result, "Should be blank");

    });

    test("Parse Utils isComment", 1, function () {

        var result = igv.isComment("# I am a comment");
        ok(result);

    });

}
