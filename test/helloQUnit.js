/**
 * Created by turner on 2/12/14.
 */

console.log('before helloQUnitTests')
function helloQUnitTests() {
    console.log('in helloQUnitTests')
    QUnit.test( "A Passing QUnit Test", function(assert) {
      console.log('in QUnit.test')
      debugger;
        var value = "hello";
        assert.equal( value, "hello");
    });

//    test( "A Failing QUnit Test", 1, function() {
//        var number = 5;
//        equal( number, 7);
//    });

}