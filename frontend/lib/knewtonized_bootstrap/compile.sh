#!/usr/bin/env bash

SRC_CSS="knewtonized_bootstrap.css"
echo "@import url(/knewton_docs/knewton_docs.css)" > $SRC_CSS 
echo "@import url(/knewtonized_bootstrap/knewtonized_bootstrap.css)" >> $SRC_CSS
juicer merge --force --document-root "$PWD" --force-image-embed --embed-images "data_uri" $SRC_CSS
rm $SRC_CSS
