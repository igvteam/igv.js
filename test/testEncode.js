function runEncodeTests() {


    asyncTest('Encode', function () {

        let columnFormat =
            [
                {   'Cell Type': '10%' },
                {      'Target': '10%' },
                {  'Assay Type': '10%' },
                { 'Output Type': '20%' },
                {     'Bio Rep': '5%' },
                {    'Tech Rep': '5%'  },
                {      'Format': '5%'  },
                {         'Lab': '20%' }

            ];

        let encodeDatasource = new igv.EncodeDataSource(columnFormat, ['bigWig', 'bigBed', 'bedpe']);
        
        encodeDatasource.retrieveData("GRCh38")
            .then(function (data) {
                ok(data);
                start();
            })
    });


}
