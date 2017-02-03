
'use strict';

( function( $, window, document, undefined ) {

    $( '.box' ).each( function() {

        var $form		 = $( this ),
            $input		 = $form.find( 'input[type="file"]' ),
            $label		 = $form.find( 'label' ),
            $errorMsg	 = $form.find( '.box__error span' ),
            $restart	 = $form.find( '.box__restart' ),
            droppedFiles = false,
            showFiles;

        showFiles = function( files ) {
            $label.text( files.length > 1 ? ( $input.attr( 'data-multiple-caption' ) || '' ).replace( '{count}', files.length ) : files[ 0 ].name );
        };

        // automatically submit the form on file select
        $input.on( 'change', function( e ) {
            showFiles( e.target.files );
            // $form.trigger( 'submit' );
        });

        // drag & drop files
        $form.addClass( 'has-advanced-upload' )
            .on( 'drag dragstart dragend dragover dragenter dragleave drop', function( e ) {
                e.preventDefault();
                e.stopPropagation();
            })
            .on( 'dragover dragenter', function() {
                $form.addClass( 'is-dragover' );
            })
            .on( 'dragleave dragend drop', function() {
                $form.removeClass( 'is-dragover' );
            })
            .on( 'drop', function( e ) {
                droppedFiles = e.originalEvent.dataTransfer.files; // the files that were dropped
                showFiles( droppedFiles );
                $form.trigger( 'submit' ); // automatically submit the form on file drop
            });

        $form.on( 'submit', function( e ) {

            // preventing the duplicate submissions if the current one is in progress
            if( $form.hasClass( 'is-uploading' ) ) return false;

            $form.addClass( 'is-uploading' ).removeClass( 'is-error' );

            e.preventDefault();

            // gathering the form data
            var ajaxData = new FormData( $form.get( 0 ) );

            if( droppedFiles ){
                $.each( droppedFiles, function( i, file )
                {
                    ajaxData.append( $input.attr( 'name' ), file );
                });
            }

            // $.ajax({
            // 			url: 			$form.attr( 'action' ),
            // 			type:			$form.attr( 'method' ),
            // 			data: 			ajaxData,
            // 			dataType:		'json',
            // 			cache:			false,
            // 			contentType:	false,
            // 			processData:	false,
            // 			complete: function()
            // 			{
            // 				$form.removeClass( 'is-uploading' );
            // 			},
            // 			success: function( data )
            // 			{
            // 				$form.addClass( data.success == true ? 'is-success' : 'is-error' );
            // 				if( !data.success ) $errorMsg.text( data.error );
            // 			},
            // 			error: function()
            // 			{
            // 				alert( 'Error. Please, contact the webmaster!' );
            // 			}
            // });

        });


        // restart the form if has a state of error/success

        $restart.on( 'click', function( e )
        {
            e.preventDefault();
            $form.removeClass( 'is-error is-success' );
            $input.trigger( 'click' );
        });

        // Firefox focus bug fix for file input
        $input
            .on( 'focus', function(){ $input.addClass( 'has-focus' ); })
            .on( 'blur', function(){ $input.removeClass( 'has-focus' ); });
    });

})( jQuery, window, document );
