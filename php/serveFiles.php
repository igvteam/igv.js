<?php
/*
 * Copyright (c) 2013 The Broad Institute, Inc.
 * SOFTWARE COPYRIGHT NOTICE
 * This software and its documentation are the copyright of the Broad Institute, Inc. All rights are reserved.
 *
 */

/*
Certain elements of this code were taken from Razvan Flarions bytserving code.
Many modifications have been made. In keeping with the license requirements,
the simplified BSD license is printed below.
*/
/*

This code is released under the Simplified BSD License:

Copyright 2004 Razvan Florian. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the following conditions are met:

   1. Redistributions of source code must retain the above copyright notice, this list of
      conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above copyright notice, this list
      of conditions and the following disclaimer in the documentation and/or other materials
      provided with the distribution.

THIS SOFTWARE IS PROVIDED BY Razvan Florian ''AS IS'' AND ANY EXPRESS OR IMPLIED
WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Razvan Florian OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The views and conclusions contained in the software and documentation are those of the
authors and should not be interpreted as representing official policies, either expressed
or implied, of Razvan Florian.

http://www.coneural.org/florian/papers/04_byteserving.php

*/

//Whether we're debugging. Note we actually have 2 concepts of debugging,
//one set by query parameter. A bit confusing
$DEBUG = False;
//Whether we're running on a local machine, or Broad server
$LOCAL = strpos($_SERVER["SERVER_NAME"], "localhost") !== false;

$LOG_FILE_PATH = "sf.log";

$LOG_FILE_HANDLE = fopen($LOG_FILE_PATH, "a");

//get filepath, do any path transformations here
$filepath = $_GET['file'];

function set_range($range, $filesize, &$first, &$last)
{
    /*
    Sets the first and last bytes of a range, given a range expressed as a string 
    and the size of the file.

    If the end of the range is not specified, or the end of the range is greater 
    than the length of the file, $last is set as the end of the file.

    If the begining of the range is not specified, the meaning of the value after 
    the dash is "get the last n bytes of the file".

    If $first is greater than $last, the range is not satisfiable, and we should 
    return a response with a status of 416 (Requested range not satisfiable).

    Examples:
    $range='0-499', $filesize=1000 => $first=0, $last=499 .
    $range='500-', $filesize=1000 => $first=500, $last=999 .
    $range='500-1200', $filesize=1000 => $first=500, $last=999 .
    $range='-200', $filesize=1000 => $first=800, $last=999 .

    */
    $dash = strpos($range, '-');
    $first = trim(substr($range, 0, $dash));
    $last = trim(substr($range, $dash + 1));
    if ($first == '') {
        //suffix byte range: gets last n bytes
        $suffix = $last;
        $last = $filesize - 1;
        $first = $filesize - $suffix;
        if ($first < 0) $first = 0;
    } else {
        if ($last == '' || $last > $filesize - 1) $last = $filesize - 1;
    }
    if ($first > $last) {
        //unsatisfiable range
        header("Status: 416 Requested range not satisfiable");
        header("Content-Range: */$filesize");
        exit;
    }
}

function buffered_read($file, $bytes, $buffer_size)
{
    /*
    Outputs up to $bytes from the file $file to standard output, $buffer_size bytes at a time.
    */
    $bytes_left = $bytes;
    while ($bytes_left > 0 && !feof($file)) {
        if ($bytes_left > $buffer_size) {
            $bytes_to_read = $buffer_size;
        } else {
            $bytes_to_read = $bytes_left;
        }
        $bytes_left -= $bytes_to_read;
        $contents = fread($file, $bytes_to_read);
        if (!$contents) {
            log_message("Error: Failed to read from file " . $file);
        }
        echo $contents;
        flush();
    }
}

function byteserve($filename)
{
    /*
    Byteserves the file $filename.  

    When there is a request for a single range, the content is transmitted 
    with a Content-Range header, and a Content-Length header showing the number 
    of bytes actually transferred.

    When there is a request for multiple ranges, these are transmitted as a 
    multipart message. The multipart media type used for this purpose is 
    "multipart/byteranges".
    */

    global $MAX_FILE_SIZE;
    $filesize = filesize($filename);

    $ranges = NULL;
    if ($_SERVER['REQUEST_METHOD'] == 'GET' && isset($_SERVER['HTTP_RANGE']) && $range = stristr(trim($_SERVER['HTTP_RANGE']), 'bytes=')) {
        $range = substr($range, 6);
        $ranges = explode(',', $range);
    }

    //If we don't find it in the header, check the query parameter
    if ($range == NULL && $ranges == NULL) {
        $strfirst = $_GET['start'];
        $last = $_GET['end'];
        $hasQueryStart = $strfirst != NULL;
        if ($hasQueryStart) {
            $first = (int)$strfirst;
            $last = (int)$last;
        }
    }

    if (($ranges && count($ranges)) || $hasQueryStart) {
        header("HTTP/1.1 206 Partial content", True, 206);
        header("Accept-Ranges: bytes");
        if (count($ranges) > 1) {
            //unsatisfiable range
            header("HTTP/1.1 501 Do not support multiple ranges", True, 501);
        } else {
            //A single range is requested.
            $range = $ranges[0];

            if ($hasQueryStart) {
                //Nothing to do, $first and last already set
            } else {
                set_range($range, $filesize, $first, $last);
            }

            header("Content-Length: " . ($last - $first + 1));

            $contRange = "Content-Range: bytes $first-$last/$filesize";
            //log_message($contRange);
            header($contRange);

            $file = fopen($filename, "rb");
            fseek($file, $first);
            buffered_read($file, $last - $first + 1, 1024);
            fclose($file);
        }

    } else {

        $isHead = $_SERVER['REQUEST_METHOD'] == 'HEAD';

        header("Accept-Ranges: bytes");
        header("Content-Length: $filesize");

        if (!$isHead) {
            readfile($filename);
        }
    }
}

function serve($filename, $download = 0)
{
    //Just serves the file without byteserving
    //if $download=true, then the save file dialog appears
    $filesize = filesize($filename);
    header("Content-Length: $filesize");
    $filename_parts = pathinfo($filename);
    if ($download) header('Content-disposition: attachment; filename=' . $filename_parts['basename']);
    readfile($filename);
}

function read_file($filepath)
{
    $fp = fopen($filepath, "r");
    $text = fread($fp, 8192);
    fclose($fp);
    return $text;
}

function log_message($message, $include_backtrace = False)
{
    $written = 0;
    global $LOG_FILE_HANDLE;
    $time = date("H:i:s d M Y");
    $act_msg = $time . " " . $message . "\n";
    $written = fwrite($LOG_FILE_HANDLE, $act_msg);
    //This doesn't include that much info
    if ($include_backtrace) {
        $written += fwrite($LOG_FILE_HANDLE, var_export(debug_backtrace(True), True));
    }
    return $written;
}

function exit_cleanly()
{
    global $LOG_FILE_HANDLE;
    fclose($LOG_FILE_HANDLE);
    exit();
}

if (!file_exists($filepath)) {
    header('HTTP/1.1 404 Not Found');
    if ($DEBUG) {
        echo "Unable to find " . $filepath;
    }
    exit_cleanly();
}

//unset magic quotes; otherwise, file contents will be modified
set_magic_quotes_runtime(0);

byteserve($filepath);

exit_cleanly();


?>