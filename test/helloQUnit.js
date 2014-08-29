/**
 * Created by turner on 2/12/14.
 */
function helloQUnitTests() {

    test( "A Passing QUnit Test", 1, function() {
        var value = "hello";
        equal( value, "hello");
    });

//    test( "A Failing QUnit Test", 1, function() {
//        var number = 5;
//        equal( number, 7);
//    });

}