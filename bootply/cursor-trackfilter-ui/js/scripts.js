
$(document).ready(function(){$('#trackFilterTabSet_GUID a').click(function (e) {
  
  // present tab
  
//	alert('present tab');
  
	e.preventDefault();
    $(this).tab('show');
})

$('#trackFilterTabSet_GUID a[data-toggle="tab"]').on('shown.bs.tab', function (e) {

  // do something awesome
  // alert('shown.bs.tab event fired');
  
  e.target // activated tab
  e.relatedTarget // previous tab
})

});