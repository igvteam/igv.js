
$(document).ready(function(){

    $('#trackFilterTabSet_GUID a').click(function (e) {

        e.preventDefault();
        $(this).tab('show');
    });

    $('#trackFilterTabSet_GUID a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        // alert('shown.bs.tab event fired');

        e.target // activated tab
        e.relatedTarget // previous tab


    })

});