/**
 * Knewtonized bootstrap
 *
 * Copyright (c) 2012 Knewton
 * Dual licensed under:
 *  MIT: http://www.opensource.org/licenses/mit-license.php
 *  GPLv3: http://www.opensource.org/licenses/gpl-3.0.html
 */
/*jslint browser: true, maxerr: 50, indent: 4, maxlen: 79 */
(function ($) {
	"use strict";

	//------------------------------
	//
	// Constants
	//
	//------------------------------

	//------------------------------
	//
	// Properties
	//
	//------------------------------

	//------------------------------
	//
	// Methods
	//
	//------------------------------

	function bindTab(event) {
		event.preventDefault();
		$(this).tab("show");
	}

	//------------------------------
	//
	// Event bindings
	//
	//------------------------------

	//------------------------------
	//
	// Exposure
	//
	//------------------------------

	//------------------------------
	// jQuery
	//------------------------------

	$.fn.bindTabs = function () {
		return this.on("click", bindTab);
	};

}(window.jQuery));

