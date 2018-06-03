/**
 * Created by turner on 2/12/14.
 */
function helloQUnitTests() {

    QUnit.test( "A Passing QUnit Test", function() {
        var value = "hello";
        assert.equal( value, "hello");
    });

//    test( "A Failing QUnit Test", 1, function() {
//        var number = 5;
//        equal( number, 7);
//    });

}