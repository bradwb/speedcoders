/**
 * jQuery localization
 * https://github.com/Knewton/jQuery-Localization
 *
 * Copyright (c) 2012 Knewton
 * Dual licensed under:
 *  MIT: http://www.opensource.org/licenses/mit-license.php
 *  GPLv3: http://www.opensource.org/licenses/gpl-3.0.html
 */

/**
* Cache of localization documents. Global, so they can be pre-cached
* @type {Object<string, Object>}
*/
if (!window.localizationCache)
	window.localizationCache = {};

(function ($) {
	"use strict";

	//------------------------------
	// Constants
	//------------------------------

	//------------------------------
	// Defaults
	//------------------------------

	/**
	* The default language to use.
	* @type {string}
	*/
	var DEFAULT_LANGUAGE = "en-US",

	/**
	* The default URL to get localization docs from.
	* @type {string}
	*/
				DEFAULT_URL = "localization/:lang.json",

	//------------------------------
	// Regular expressions
	//------------------------------

	/**
	* @type {RegExp}
	*/
				RX_LOCSTRING = /^:|^\-|^\+|^\.|^\$|^\^/,

	//------------------------------
	//
	// Properties
	//
	//------------------------------

	//------------------------------
	// System
	//------------------------------

	/**
	* The language used for localization.
	* @type {string}
	*/
				language,

	/**
	* The non-dialect part of the code (the en in en-US).
	* Used to replace [lang] attribute.
	* @type {string}
	*/
				langCode,

	/**
	* The deferred notifier for localization.
	* @type {jQuery.Deferred}
	*/
				deferred = $.Deferred(),

	//------------------------------
	// Localization
	//------------------------------

	/**
	* The localization document.
	* @type {Object<string, string|Object>}
	*/
				doc;

	//------------------------------
	//
	// Methods
	//
	//------------------------------

	//------------------------------
	// Utilities
	//------------------------------

	/**
	* Gets the localization string by either the data- or standard attribute.
	* @param {jQuery} element The element being localized.
	* @param {string} lang The language used; replaces standard attribute val.
	*/
	function getLocString(element, lang) {
		var s = element.data("lang");
		if (!s) {
			s = element.attr("lang");
			if (lang != undefined) {
				element.attr("lang", lang);
			}
		} else if (lang != undefined) {
			element.attr("data-lang", lang);
		}

		return s;
	}

	//------------------------------
	// Pseudo-selectors
	//------------------------------

	/**
	* Matches elements defining localization contexts.
	* @param {DOMElement} e
	*/
	function localizationContextSelector(e) {
		return $(e).is("[lang^=':'], [lang^='.'], " +
								"[data-lang^=':'], [data-lang^='.']"
				);
	}

	/**
	* Matches elements needing localization strings.
	* @param {DOMElement} e
	*/
	function localizationSelector(e) {
		return $(e).is("[lang^='+'], [lang^='-'], [lang^='^'], [lang^='$'], " +
								"[data-lang^='+'], [data-lang^='-'], [data-lang^='^'], " +
								"[data-lang^='$']"
				);
	}

	//------------------------------
	// Localization context
	//------------------------------

	/**
	* Returns the localization context for the element.
	* @param {jQuery} element The element.
	* @param {Array<string>} context The current context.
	* @return {Array<string>} The context for the localization key.
	*/
	function localizationContext(element, context) {
		if (!$.isArray(context)) {
			context = [];
		}
		if (element.is(":localizationContext")) {
			var k = getLocString(element);
			context.unshift(k.substr(1));
			if (k.substr(0, 1) !== ".") {
				return context;
			}
		}
		element.parents(":localizationContext").each(function () {
			var key = getLocString($(this));
			context.unshift(key.substr(1));
			if (key.substr(0, 1) !== ".") {
				return false;
			}
		});

		return context;
	}

	//------------------------------
	// Request handler
	//------------------------------

	/**
	* Called when we get a localization document.
	* @param {Object<string, Object|string>} d The localization document.
	*/
	function requestSuccess(d) {
			if (!d) //whats up doc?
				return;
			doc = d;
			var isGeneric = (language == langCode); //not regional
			window.localizationCache[language] = doc;
			if (isGeneric) {
				var regionalDoc = window.localizationCache[$.language];
				if (regionalDoc) {
					$.extend(true, doc, regionalDoc);
				}
			}
			$.language = language;
			$.langCode = langCode;
			$.localization = doc;

			if (isGeneric) {
				if ($.isEmptyObject(doc)) {
					deferred.reject(language);
					return;
				}

				localize();
				getLocString($("body"), langCode);
				deferred.resolve(doc, language);
			} else {
				setLanguage(langCode);  //get the generic version
			}
	}

	/**
	* Called when a localization document fails to load.
	*/
	function requestFailure(jqXHR, textStatus, errorThrown) {
		if (textStatus === "parsererror") {
			throw "Localization document " + language + " is invalid JSON!";
		}

		if (language == langCode) { //cannot find generic
			var doc = window.localizationCache[$.language];    //just use the regional
			requestSuccess(doc);
		} else {    //cannot find regional
			setLanguage(langCode);  //try to get generic
		}
	}

	//------------------------------
	// Localizer
	//------------------------------

	/**
	* Return a localization string from a key string.
	* @param {string|Array<string>} s The key string.
	* @param {string|Array<string>} context Additional context.
	* @return {string} The localization string.
	*/
	function loc(s, context) {
		// Simply return the string again if we don't have a loc document
		if (!$.localization) {
			return null;
		}
		if ($.isPlainObject(s)) {
			$.each(s, function (k, v) {
				s[k] = loc(v, context);
			});
			return s;
		}

		var o = doc;

		if (!$.isArray(s)) {
			// Unset context if we're using a - formatter
			if (s.substr(0, 1) === "-") {
				context = null;
			}

			s = s.replace(RX_LOCSTRING, "").split(":");
		}

		if (context) {
			if (!$.isArray(context)) {
				context = context.replace(RX_LOCSTRING, "").split(":");
			}

			s = context.concat(s);
		}

		s = s.join(":");

		// Join before split to handle nested keys
		$.each(s.split(":"), function (i, key) {
			o = o[key];
			if (!o && o !== "") {
				throw "missing: '" + s + "' not in localization";
			}
		});

		if (typeof o !== "string") {
			throw "missing: '" + s + "' not in localization";
		}

		return o.toString();
	}

	/**
	* Localizes an element.
	* @param {jQuery} element The element to localize.
	*/
	function localizeElement(element) {
		if (!element.is(":localization")) {
			return;
		}

		var es = getLocString(element, langCode),
						mode = es.substr(0, 1),
						key = es.substr(1),
						a = element.data("locAttr"),
						s = loc(key, mode === "-" ? null : element.localizationContext());

		element.data("localization_key", key);
		if (element.is("optgroup")) {
			element.attr("label", s);
		} else {
			switch (mode) {

				case "^":
					element.prepend(s);
					break;

				case "$":
					element.append(s);
					break;

				default:
					if (a !== undefined) {
						element.attr(a, s);
					} else {
						element.html(s);
					}
					break;
			}
		}
	}

	/**
	* Localized deferred notifier.
	* @param {function=} success A callback to be notified when ready.
	* @param {function=} failure A callback to be notified if fails.
	*/
	function localized(success, failure) {
		if ($.isFunction(success)) {
			deferred.then(success);
		}

		if ($.isFunction(failure)) {
			deferred.hasFailureHandler = true;
			deferred.fail(failure);
		}
	}

	/**
	* Localize a section of the document.
	* @param {string|jQuery} root The root node to localize.
	*/
	function localize(root) {
		var e = $(":localization", root);

		if (root) {
			root = $(root);
			if (root.is(":localization")) {
				e = e.add(root);
			}
		}

		return e.localize(true);
	}

	/**
	* Sets the language used for localization.
	* @param {string} lang The language to use.
	* @param {string} url The path to load the localization document from.
	*    This can contain a url var named :lang.
	*/
	function setLanguage(lang, url) {
		lang = lang || DEFAULT_LANGUAGE;
		langCode = lang.split("-")[0];
		language = lang;

		var cachedDoc = window.localizationCache[lang];
		if (cachedDoc) {
			requestSuccess(cachedDoc);
			return;
		}

		url = url || DEFAULT_URL;

		url = url.replace(":lang", language);
		if (window.fordPacked) {
			if (window.fordSrc[url]) {
				requestSuccess(window.fordSrc[url]);
				return;
			}
		}

		$.ajax({
			cache: false,
			url: url,
			success: requestSuccess,
			error: requestFailure,
			dataType: "json"
		});
	}

	/**
	* Holds the jQuery ready function until localization has completed.
	*/
	function localizeBeforeReady() {
		$.holdReady(true);
		localized(function () { $.holdReady(false); });
	}

    /**
     * Save localizer.
     */
    function sloc() {
        try {
            return loc.apply(this, arguments);
        } catch (e) {}
        return "";
    }

    /**
     * Plurality localizer.
     */
    function ploc(s, num) {
        return loc(s, num === 1 ? "singular" : "plural");
    }

	//------------------------------
	//
	// Exposure
	//
	//------------------------------

	$.extend($.expr[':'], {

		//------------------------------
		// Pseudo-selectors
		//------------------------------

		'localizationContext': localizationContextSelector,
		'localization': localizationSelector

	});

	$.extend($.fn, {

		//------------------------------
		// Localizer
		//------------------------------

		'localizationContext': function () {
			return localizationContext(this.eq(0));
		},
		'localize': function (forElement) {
			return this.each(function () {
				(forElement ? localizeElement : localize)($(this));
			});
		}

	});

	$.extend($, {

		//------------------------------
		// Localizer
		//------------------------------

		'loc': loc,
        sloc: sloc,
        ploc: ploc,
		'localized': localized,
		'localize': localize,
		'setLanguage': setLanguage,
		'localizeBeforeReady': localizeBeforeReady

	});

	//------------------------------
	// Startup
	//------------------------------

	$(function () {
		var e = $("meta[name=localization-default-language]");
		if (e.length) {
			setLanguage(e.attr("content"),
										$("meta[name=localization-base-url]").attr("content"));
		}
	});

} (window["jQuery"]));
