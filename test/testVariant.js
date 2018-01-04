function runVariantTests() {



    test( "Test ref block", 1, function() {

        var json = '{"referenceName": "7","start": "117242130","end": "117242918","referenceBases": "T","alternateBases": ["\u003cNON_REF\u003e"]}';

        var obj = JSON.parse(json);

        var variant = igv.createGAVariant(obj);

        ok(variant.isRefBlock());
    });

    test( "Test insertion", function () {

        var json = '{"referenceName": "7","start": "117242918","end": "117242919","referenceBases": "T","alternateBases": ["TA"]}';

        var obj = JSON.parse(json);

        var variant = igv.createGAVariant(obj);

        ok(variant.isRefBlock() === false);

        equal(117242919, variant.start);

    });

    test( "Test deletion", function () {

        var json = '{"referenceName": "7","start": "117242918","end": "117242920","referenceBases": "TA","alternateBases": ["T"]}';

        var obj = JSON.parse(json);

        var variant = igv.createGAVariant(obj);

        ok(variant.isRefBlock() === false);

        equal(117242919, variant.start);

    });
}
