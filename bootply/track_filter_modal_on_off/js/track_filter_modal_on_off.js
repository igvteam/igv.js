
$(document).ready(function(){

    var obj = $('#trackFilterTabSet_GUID');

    obj.find('a').click(function (e) {

        var that = $(this);

        e.preventDefault();

        that.tab('show');

    });

    obj.find('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {

        var thang = $(this)[0],
            active = e.target,
            dormant = e.relatedTarget;

        console.log("active " + active.id + " inactive " + dormant.id);

    });

    $('.btn-toggle').click(function() {

        var thang = $(this);

        thang.find('.btn').toggleClass('active');

        if (thang.find('.btn-primary').size() > 0) {
            thang.find('.btn').toggleClass('btn-primary');
        }

        $(this).find('.btn').toggleClass('btn-default');

    });

    $('form').submit(function(){

        alert($(this["options"]).val());
        return false;
    });



});