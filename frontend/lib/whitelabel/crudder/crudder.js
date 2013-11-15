/**
 * Whitelabel CRUD Renderer (Crudder)
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
	// Templates
	//------------------------------

		/**
		 * A list of managed entities. Each index corresponds to the markup
		 * template index.
		 * @type {Array<string>}
		 */
	var entities = [],
		lookup = {},

		/**
		 * The object and table specs.
		 * @type {Array<Array<string|Array<string>>>}
		 */
		details = [],

		/**
		 * The datatable objects.
		 * @type {Array<jQuery.DataTable>}
		 */
		tables = [];

	//------------------------------
	//
	// Methods
	//
	//------------------------------

	//------------------------------
	// Setup
	//------------------------------

	function loc(str, context, add) {
		if (add !== undefined) {
			if ($.isArray(add)) {
				context = context.concat(add);
			} else {
				context.push(add);
			}
		}

		try {
			return $.loc(str, context);
		} catch (e) {}

		return null;
	}

	function locTbl(name, str, add) {
		return loc(str, ["crudder", name, "table"], add);
	}

	function locForm(name, str, context) {
		return loc(str, ["crudder", name, "form"], add);
	}

	function createTable(name, index, tbl, url) {
		var container = $("#crudder-all").update({
				".crudder-title": locTbl(name, "title"),
				".crudder-create": {
					attr: {
						href: "#" + url
					}
				},
				".create-button": {
					html: locTbl(name, "create")
				}
			}, index),
			cols = [],
			table;

		$.each(tbl, function (idx, header) {
			var label;

			if ($.isArray(header)) {
				label = header[0];
				cols.push({sType: "html"});
			} else {
				label = header;
				cols.push(null);
			}

			container.find("thead tr").update({
				th: locTbl(name, label, "headers")
			}, idx);
		});

		table = container.find(".crudder-table").dataTable({
			aaSorting: [[0, "asc"]],
			bAutoWidth: false,
			oLanguage: {
				sSearch: $.loc("search_table", "common"),
				sEmptyTable: $.loc("empty_table", "common"),
				sZeroRecords: $.loc("zero_table", "common")
			},
			aoColumns: cols
		});

		tables[index] = table;
	}

	function createForm(name, index, obj, crud) {
		var container = $("#crudder-get").update({}, index),
			calls = crud.calls,
			fields = {id: {type: "hidden", id: true}},
			layout = {
				common: ["@"],
				construct: [
					"+create"
				],
				revise: [
					"id",
					"+revise"
				],
				remove: [
					"id",
					"+remove"
				]
			},
			messages,
			defs = obj[0],
			order = obj[1],
			groups = obj[2],
			fieldsets = obj[3],
			controls = obj[4],
			fieldOrder,
			l = $.localization;

		if (l && l.crudder && l.crudder[name] && l.crudder[name].form) {
			messages = l.crudder[name].form.messages;
		}

		if ($.isArray(order)) {
			layout.common = layout.common.concat(order);
			fieldOrder = order;
		} else {
			fieldOrder = [];
			$.each(order, function (k, vals) {
				layout[k] = vals.concat(layout[k]);
				fieldOrder = fieldOrder.concat(vals);
			});
			fieldOrder = $.unique(fieldOrder);
		}

		$.each(defs, function (key, o) {
			if ($.isPlainObject(o)) {
				fields[key] = o;
			} else {
				fields[key] = {
					type: defs[key]
				};
			}

			if (key.substr(0, 1) === "~") {
				fields[key].fieldsLabelPrefix = "+fields";
			}

			if (!fields[key].label && fields[key].type !== "hidden") {
				fields[key].label = "+fields:" + key;
			}
		});

		container.form(name, true, {
			className: "span6",
			localizationContext: $.strf("crudder:{}:form", name),
			title: "+title",
			method: "API",
			actions: {
				construct: calls.create,
				revise: calls.update,
				remove: calls.remove
			},
			fields: fields,
			controls: $.extend({}, controls, {
				return_all: {
					type: "link",
					href: "#" + crud.prefix + crud.baseURI,
					label: "-common:back",
					className: "btn-inverse"
				},
				create: {
					type: "submit",
					label: "-common:create",
					className: "btn-primary"
				},
				revise: {
					type: "submit",
					label: "-common:revise",
					className: "btn-primary"
				},
				confirm_delete: {
					type: "link",
					href: "#/delete",
					attr: {
						"data-route-path": crud.prefix + crud.entityURI
					},
					label: "-common:confirm_delete",
					className: "btn-warning"
				},
				cancel_delete: {
					type: "link",
					href: "#/",
					attr: {
						"data-route-path": crud.prefix + crud.entityURI
					},
					label: "-common:cancel",
					className: "btn"
				},
				remove: {
					type: "submit",
					label: "-common:remove",
					className: "btn-warning"
				}
			}),
			groups: $.extend({}, groups, {
				create: ["*return_all", "*create"],
				revise: ["*return_all", "*revise", "*confirm_delete"],
				remove: ["*return_all", "*remove", "*cancel_delete"]
			}),
			fieldsets: fieldsets,
			layout: layout,
			messages: messages,
			cleanup: {
				remove: {
					success: {
						redirect: "#" + crud.prefix + crud.baseURI
					}
				}
			}
		});
	}

	//------------------------------
	// Rendering
	//------------------------------

	function handleType(type, verb) {
		var index = lookup[type],
			elements = $("#crudder-" + verb + " .crudder").hide();

		if (index !== undefined && elements.length > index) {
			return elements.eq(index);
		} else {
			$.deeplink.error("crudder_unknown");
		}

		return null;
	}

	function render(element, verb) {
		$("#crudder, #crudder-" + verb).add(element).show();
		$.deeplink.loaded();
	}

	function all(type) {
		return function (data) {
			$.pageData.crudder = data;
			var element = handleType(type, "all"),
				rows,
				row,
				index,
				table,
				defs;

			if (element) {
				index = lookup[type];
				defs = details[index]; // [obj, tbl]
				table = tables[index];

				rows = [];

				$.each(data, function (dIdx, datum) {
					row = [];

					$.each(defs[1], function (idx, col) {
						if ($.isArray(col)) {
							if ($.isFunction(col[1])) {
								row.push(col[1](datum[col[0]], datum));
							} else {
								row.push($.strf(true, col[1], datum));
							}
						} else {
							var val = datum[col];
							if (typeof val === "boolean") {
								val = $.loc(val ? "yes" : "no", "common");
							}
							row.push(val || "--");
						}
					});

					rows.push(row);
				});

				table.fnClearTable();
				table.fnAddData(rows);

				render(element, "all");
			}
		}
	}

	function one(type) {
		return function (data) {
			$.pageData.crudder = data;
			var element = handleType(type, "get");
			if (element) {
				$.form.mode(type, "revise", data);
				render(element, "get");
			}
		}
	}

	function del(type) {
		return function (data) {
			$.pageData.crudder = data;
			var element = handleType(type, "get");
			if (element) {
				$.form.mode(type, "remove", data);
				render(element, "get");
			}
		}
	}

	function make(type) {
		return function (data) {
			$.pageData.crudder = data;
			var element = handleType(type, "get");
			if (element) {
				$.form.mode(type, "construct");
				render(element, "get");
			}
		}
	}

	/**
	 * Creates a CRUD renderer, basically a webpage in a box for entities.
	 *
	 * Uses the same deeplink URLs which would normally be used by the API
	 * calls themselves to provide enforced consistency conveniently.
	 *
	 * Object structure should be something like using actual types.
	 * 		{id: String, is_something: Boolean, nested: Object}
	 *
	 * Table structure should be names mapping to object keys, optinally with
	 * a formatting string for display as a tuple:
	 * 		[["name", "<a href=.."], "date"]
	 *
	 * The HTML type will be used for datatables which provide a formatting str
	 *
	 * @param {string|Array<string>} type The type to use. If an array is
	 * 		provided, the second arg is the name for the all-type call.
	 * 		(["foo", "foos"] makes all-foos instead of the standard all-foo)
	 * @param {string} url The base URL to use.
	 * @param {Object} obj Object structure.
	 * @param {string} id The ID part of the path. Uses /:id by default.
	 * @param {boolean?} postUpdate Use POST instead of PUT for the update.
	 * @return {Object} The settings for this crud call group.
	 */
	function crudder(name, url, obj, tbl, apiOpts, ovr, id, postUpdate) {
		var uri = $.isArray(url) ? url[0] : url,
			crud = $.api.restCRUD(name, uri, apiOpts, id, postUpdate, ovr),
			index = entities.length,
			name = crud.type,
			newURL = "/new" + crud.baseURI,
			deleteURL = crud.entityURI + "/delete",
			prefix = $.isArray(url) ? url[1] : "";

		crud.prefix = prefix;

		entities.push(name);
		lookup[name] = index;
		details[index] = [obj, tbl];

		// Set up the deeplink routes
		$.api.route(prefix + crud.baseURI, crud.calls.all);
		$.api.route(prefix + crud.entityURI, crud.calls.get);
		$.api.route(prefix + deleteURL, crud.calls.get, del(crud.type));

		// Set up regular deeplink roots
		$.route(prefix + newURL, make(crud.type));

		$.localized(function () {
			createTable(name, index, tbl, prefix + newURL);
			createForm(name, index, obj, crud);
		});

		// Bind the handlers; api.route uses proxies which is too restrictive
		// for deeplink handling in this context.
		$.api.route(prefix + crud.baseURI, crud.calls.all, all(crud.type));
		$.api.route(prefix + crud.entityURI, crud.calls.get, one(crud.type));

		return crud;
	}

	//------------------------------
	//
	// Event bindings
	//
	//------------------------------

	$.deeplink.on("loading", function () {
		$("#crudder, .crud-container").hide();
	});

	//------------------------------
	//
	// Exposure
	//
	//------------------------------

	$.crudder = crudder;

}(window.jQuery));

