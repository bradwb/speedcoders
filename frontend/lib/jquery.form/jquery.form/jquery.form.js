/**
 * jQuery Form
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
    // RegExp
    //------------------------------

        /**
         * Finds spaces.
         * @type {RegExp}
         */
    var RX_S = /\s/g,

        /**
         * Makes selectors okay as names.
         */
        RX_SANITIZE = /[^A-Za-z0-9-_\\s]/g,

    //------------------------------
    // Settings
    //------------------------------

        /**
         * The blocks within the default settings to create if missing.
         * @type {Array<string>}
         */
        DEFAULT_DEF_BLOCKS = ["fieldsets", "groups", "messages", "controls"],

        /**
         * A list of all the event types we want to bind on fields.
         * Capitalized for convenience of on + Change = onChange
         * @type {Array<string>}
         */
        FIELD_EVENT_TYPES = ["Change", "Keydown", "Keyup", "Blur", "Focus"],

        /**
         * The default settings for all forms.
         * @type {Object}
         */
        DEFAULT_SETTINGS = {
            id: {
                separator: "-",
                prefix: "jqf"
            },
            elements: {
                title: "h2.form-title",
                messages: {
                    container: "div",
                    title: "strong",
                    text: "span",
                    success: "div.alert.alert-success",
                    error: "div.alert.alert-error"
                },
                fieldset: {
                    root: "fieldset",
                    legend: "legend",
                    text: "div.alert.alert-info",
                    help: "p.muted"
                },
                group: {
                    stacked_first: "div.form-field-wrapper",
                    stacked_wrapper: "div.stacked-group-wrapper",
                    stacked: "div.space-top.form-field-wrapper",
                    root: "div.control-group",
                    controls: "div.form-actions",
                    label_container: "div.control-label",
                    label: "label",
                    container: "div.controls.controls-row",
                    hint: "span.help-inline",
                    text: "span.help-block",
                    help: "span.help-block"
                },
                field: {
                    hint: "span.help-inline",
                    help: "span.help-block",
                    wrapper: "div.control-group.form-field-wrapper",
                    container: "div.controls.controls-row.form-field-container",
                    selectPlaceholder: {
                        select: "option.option-placeholder[value=].hide[disabled]",
                        multiple: "option.option-placeholder[value=][disabled]"
                    },
                    input: {
                        file: "input[type=file]",
                        hidden: "input[type=hidden]",
                        password: "input[type=password]",
                        text: "input[type=text]",
                        checkbox: "input[type=checkbox]",
                        radio: "input[type=radio]",
                        textarea: "textarea",
                        select: "select",
                        multiple: "select[multiple=multiple]"
                    },
                    labels: {
                        standard_container: "div.control-label",
                        simple: "label",
                        standard: "label",
                        radio: "label.radio",
                        checkbox: "label.checkbox"
                    }
                },
                controls: {
                    wrapper: "div.control-group.form-control-wrapper",
                    container: "div.controls.controls-row.form-controls",
                    hint: "span.help-inline",
                    text: "span.help-block",
                    help: "span.help-block",
                    root: "button.btn[type=button]",
                    submit: "button.btn[type=submit]",
                    reset: "button.btn[type=reset]",
                    link: "a.btn",
                    labels: {
                        simple: "label",
                        standard: "label.control-label",
                        radio: "label.radio",
                        checkbox: "label.checkbox"
                    }
                }
            },
            validations: {
                errors: {
                    group: "label label-important",
                    single: "help-inline"
                }
            },
            clones: {
                container: "div.spawn-container",
                field_container: "div.field-spawn-container.clearfix",
                spawner: ["div.spawner.btn-toolbar", ["div.btn-group", [
                        "button.btn.btn-danger.despawn[type=button]", [
                            "i.icon-minus-sign"
                        ],
                        "button.btn.btn-success.spawn[type=button]", [
                            "i.icon-plus-sign"
                        ]
                    ]
                ]]
            }
        },

    //------------------------------
    //
    // Properties
    //
    //------------------------------

    //------------------------------
    // Form
    //------------------------------

        /**
         * The definitions for forms in the system.
         * @type {Object}
         */
        forms = {},

        /**
         * Form processing callbacks by name.
         * @type {Object}
         */
        callbacks = {};

    //------------------------------
    //
    // Methods
    //
    //------------------------------

    //------------------------------
    // Utility
    //------------------------------

    /**
     * Use the localization engine to change the string, optionally.
     * @param {string} s The string to convert.
     * @param {Object} form The form definition.
     * @return {string} The original string, or the localized one.
     */
    function loc(s, form) {
        if (form && (form.localizationContext || form.localize)) {
            try {
                return $.loc(s, form.localizationContext);
            } catch (e) {}
        }

        return s;
    }

    /**
     * Extends a shorthand array if the id has a value to display.
     * @param {string} id The type of thing being generated.
     * @param {Object} f The form.
     * @param {Object} d Contains display values.
     * @param {Object} s Contains element shorthand.
     * @param {Array} m The markup array to extend.
     * @param {string} Class for input.
     * @param {boolean} r Reverse the push to an unshift.
     */
    function textElement(id, f, d, s, m, c, r) {
        if ($.isArray(id)) {
            $.each(id, function (i, v) {
                textElement(v, f, d, s, m, c, r);
            });
        } else if (d[id]) {
            var out = [s[id]];
            if (c !== undefined) {
                out.push(cls(c));
            }
            out = out.join("");
            if (id === "label") {
                m[Boolean(r) ? "unshift" : "push"](s.label_container, [
                    out, "." + loc(d[id], f)]);
                return;
            }
            m[Boolean(r) ? "unshift" : "push"](out, "." + loc(d[id], f));
        }
    }

    /**
     * Returns the shorthand attribute style for the given key/value.
     * @param {string} k The attribute.
     * @param {string} v The value.
     * @return {string} The shorthand attribute string.
     */
    function attr(k, v) {
        return "[" + k + "=" + v + "]";
    }

    /**
     * Formats the given string for shorthand classes.
     * @param {string} s The string of space separated classes.
     * @return {string} The dot separated classes for shorthand.
     */
    function cls(s) {
        return "." + s.replace(RX_S, ".");
    }

    /**
     * Extract the serialized form values.
     * @param {jQuery} e The form.
     * @return {Object} The form's values in an object.
     */
    function serializeObject(e) {
        var a = e.eq(0).serializeArray(),
            o = {};

        $.each(a, function (i, e) {
            if (o[e.name] === undefined) {
                o[e.name] = e.value;
                return;
            } else if (!$.isArray(o[e.name])) {
                o[e.name] = [o[e.name]];
            }
            o[e.name].push(e.value);
        });

        return o;
    }

    //------------------------------
    // Markup
    //------------------------------

    /**
     * Renders the markup for a collection.
     * @param {Object} form The form definition.
     * @param {string} name The name of the collection.
     * @param {string} type The type of the collection (fieldset, group).
     * @param {Array|string} pre Text which preceeds fields.
     * @param {Array|string} post Text which proceeds fields.
     * @param {boolean} clone Is this field part of a clone.
     */
    function wrapperMarkup(form, name, type, pre, post, clone) {
        var m = [],
            s = $.form.settings.elements[type],
            d = form[type + "s"][name],
            i = [],
            fields,
            control = false,
            isGroup = (type === "group"),
            inputClass,
            root;

        if (!$.isPlainObject(d)) {
            fields = d;
            d = undefined;
        } else {
            fields = d.fields;
        }

        if ((d && d.label === undefined) && form.localizationContext) {
            d.label = "+" + name;
        }

        if (typeof fields === "string") {
            fields = fields.split(" ");
        }

        if (d && !d.textOutside && pre) {
            textElement(pre, form, d, s, m,
                d.preLabelClass || d.preLabelClassName);
        }

        // Create storage for group contents
        if (isGroup) {
            if (!d || !d.nonValidationGroup) {
                if (!form.groupContents) {
                    form.groupContents = {};
                }
                if (!form.groupContents[name]) {
                    form.groupContents[name] = [];
                }
            }
        }

        $.each(fields, function (idx, f) {
            if (f.substr(0, 1) === "*") {
                // Any controls makes a control group
                control = true;
            }

            var isClone = clone || (d && d.cloneable),
                fm = resolveMarkup(form, f, true, isGroup, name, isClone);

            if (isGroup && (d && d.stackedFields)) {
                i.push(s[idx === 0 ? "stacked_first" : "stacked"], [fm]);
            } else {
                i = i.concat(fm);
            }

            if (isGroup && idx !== (fields.length - 1)) {
                if (!(d && d.stackedFields)) {
                    // Add a nbsp between groups to prevent running together
                    i.push("~&nbsp;");
                }
            }
        });

        // Grab all special fields
        extractSpecialFields(form, name, d);

        if (isGroup && (d && d.stackedFields)) {
            i = [s.stacked_wrapper, i];
        }

        if (d && d.fieldClass) {
            i[0] += cls(d.fieldClass);
        }

        if (d && d.cloneable) {
            if (i[0].indexOf(".span") === -1) {
                i[0] += ".span0";
            }

            if (d.fieldCloneable) {
                i = [i, $.form.settings.clones.spawner];
                if (d.spawnerClass) {
                    i[1][0] += cls(d.spawnerClass);
                } else {
                    i[1][0] += ".span1";
                }

                i = [$.form.settings.clones.field_container, i];
                i = [$.form.settings.clones.container, i];
                if (d.spawnClass) {
                    i[0] += cls(d.spawnClass);
                }
                if (d.onlyLastSpawner || d.singleSpawner) {
                    i[0] += ".single-spawner";
                }
                if (d.cloneTriggeredBy) {
                    i[0] += ".triggered-spawn";
                }

                i[0] += $.strf(".cloneable[data-max-clones={}]",
                    $.isNumeric(d.cloneable) ? d.cloneable : -1);
            }
        }

        if (s.hint && d && d.hint) {
            if (d.blockHint) {
                i.push(s.help, "." + loc(d.hint, form));
            } else {
                i.push(s.hint, "." + loc(d.hint, form));
            }
        }

        if (!control && s.container) {
            m.push(s.container, i);
        } else {
            m = m.concat(i);
        }

        if (d && !d.textOutside && post) {
            textElement(post, form, d, s, m,
                d.postLabelClass || d.postLabelClassName);
        }

        // If the group tells us to ignore control flag
        if (!isGroup || d && d.ignoreControls && control) {
            control = false;
        }

        // Set the root node for the container
        root = control ? s.controls : s.root;

        if (isGroup) {
            root += ".input-group";
        }

        // If we have classes to set
        if (d && (d["class"] || d.className)) {
            root += cls(d["class"] || d.className);
        }

        if (d && d.nonValidationGroup) {
            root += ".independent-errors";
        }

        if (d && d.cloneable && !d.fieldCloneable) {
            m.push($.form.settings.clones.spawner);
            if (d.spawnerClass) {
                m[m.length - 1][0] += cls(d.spawnerClass);
            } else {
                m[m.length - 1][0] += ".span1";
            }
        }

        m = [root + attr("name", name), m];

        if (d && d.textOutside) {
            i = [];
            if (pre) {
                textElement(pre, form, d, s, i,
                    d.preLabelClass || d.preLabelClassName);
                m = i.concat(m);
            }
            if (post) {
                textElement(post, form, d, s, m,
                    d.postLabelClass || d.postLabelClassName);
            }
        }

        if (d && d.cloneable && !d.fieldCloneable) {
            m = [$.form.settings.clones.container, m];
            if (d.spawnClass) {
                m[0] += cls(d.spawnClass);
            }
            if (d.onlyLastSpawner || d.singleSpawner) {
                m[0] += ".single-spawner";
            }
            if (d.cloneTriggeredBy) {
                m[0] += ".triggered-spawn";
            }
            m[0] += $.strf(".cloneable[data-max-clones={}]",
                $.isNumeric(d.cloneable) ? d.cloneable : -1);
        }

        return m
    }

    /**
     * Generates the markup for the given fieldset.
     * @param {Object} form The form definition.
     * @param {string} name Fieldset name.
     * @param {boolean} clone Is this field part of a clone.
     * @return {Array} The markup.
     */
    function fieldsetMarkup(form, name, clone) {
        return wrapperMarkup(form, name, "fieldset",
                ["legend", "text", "help"], clone);
    }

    /**
     * Generates the markup for the given group.
     * @param {Object} form The form definition.
     * @param {string} name Group name.
     * @param {boolean} clone Is this field part of a clone.
     * @return {Array} The markup.
     */
    function groupMarkup(form, name, clone) {
        return wrapperMarkup(form, name, "group", ["label", "text"], "help",
                clone);
    }

    /**
     * Returns markup for an option.
     * @param {Object} form The form.
     * @param {Array<string>|string} values The selected value(s).
     * @param {string} v The value.
     * @param {string} l The label.
     * @return {Array} The markup.
     */
    function optionMarkup(form, d, v, l, h) {
        var o = "option[value=" + v + "]",
            values = d.value;
        if (values && (($.isArray(values) && $.inArray(v, values) > -1) ||
v === values)) {
            o += "[selected]";
            h.hadValue = true;
        }

        if (d.valueContext) {
            switch (l.substr(0, 1)) {

            case "+":
            case "$":
            case "^":
                l = l.substr(1);
                break;
            }

            l = d.valueContext + ":" + l;
        }

        return [o, "." + loc(l, form)];
    }

    /**
     * Generates the markup for a given radio or checkbox.
     * @param {Object} f The form settings.
     * @param {Object} s The settings.
     * @param {string} t The input type (radio, checkbox).
     * @param {string} n The input name.
     * @param {string} v The value of the input.
     * @param {boolean} c If checked or not.
     * @param {boolean} a Attributes for input.
     * @param {string?} l The field label, if any.
     * @param {string?} lClass The class for either the label or input.
     * @param {string?} iClass The class for the input explicitly.
     * @return {Array} The markup, wrapped in an array.
     */
    function radiobox(f, s, d, t, n, v, c, a, l, lClass, iClass) {
        if (v === undefined) {
            v = "1";
        }

        var input = s.input[t] + attr("name", n) + attr("value", v);
        if (c) {
            input += attr("checked", "true");
        }
        if (iClass) {
            input += cls(iClass);
        }
        if (a) {
            $.each(a, function (k, v) {
                input += attr(k, v);
            });
        }
        if (!l && f.localizationContext) {
            l = "+" + l;
        }
        if (d.valueContext) {
            switch (l.substr(0, 1)) {

            case "+":
            case "$":
            case "^":
                l = l.substr(1);
                break;
            }

            l = d.valueContext + ":" + l;
        }
        if (!l) {
            input += lClass;
            return [input];
        } else {
            return [s.labels[t] + lClass, [input], "." + loc(l, f)];
        }
    }

    /**
     * Wrapper for radioboxMarkup using a def.
     * @param {Object} f The form settings.
     * @param {Object} s The settings.
     * @param {Object} n The name for the radiobox.
     * @param {Object} d The def for the radiobox.
     * @param {string} lc The label class, or an empty string.
     * @return {Array} The markup, wrapped in an array.
     */
    function radioboxFromDef(f, s, n, d, l) {
        var c;
        if ($.isArray(d.checked)) {
            c = $.inArray(d.value, d.checked) > -1;
        } else {
            c = Boolean(d.checked);
        }
        return radiobox(f, s, d, d.type, n, d.value, c, d.attr, d.label, l,
                d.inputClass);
    }

    /**
     * Extracts special work from the field definition.
     * Because of how form building works, these need to get processed after
     * the dom is ready and the form is drawn, but they are defined much in
     * advance of that stage.
     * @param {Object} form The form.
     * @param {string} field The name of the field.
     * @param {Object} definition The field def.
     */
    function extractSpecialFields(form, field, definition) {
        if (!definition) {
            return;
        }

        // Only extract once per field, using the events to keep track.
        if (form.field_events[field] !== undefined) {
            if (!form.field_events[field].crossDefined) {
                return;
            }
        }

        var events = form.field_events[field] || {},
            eventDefs,
            flags = definition.flags;

        delete events.crossDefined;

        function addEventTasks(event, tasks) {
            if (tasks) {
                if (!$.isArray(tasks)) {
                    tasks = [tasks];
                }
                if (events[event]) {
                    events[event] = events[event].concat(tasks);
                } else {
                    events[event] = tasks;
                }
            }
        }

        function crossEventTasks(f, event, tasks) {
            if (tasks) {
                if (!$.isArray(tasks)) {
                    tasks = [tasks];
                }
                if (!form.field_events[f]) {
                    if (f === field) {
                        form.field_events[f] = events;
                    } else {
                        form.field_events[f] = {crossDefined: true};
                    }
                }
                var e = form.field_events[f];
                if (e[event]) {
                    e[event] = e[event].concat(tasks);
                } else {
                    e[event] = tasks;
                }
            }
        }

        // Handle field flags
        if (flags) {
            if (!$.isArray(flags)) {
                flags = flags.split(" ");
            }
        }
        if (form.fieldFlags) {
            if (!$.isArray(flags)) {
                flags = form.fieldFlags;
            } else {
                flags = flags.concat(form.fieldFlags);
            }
        }
        if (flags) {
            $.each($.unique(flags), function (i, flag) {
                switch (flag) {

                case "autochange":
                    addEventTasks("keyup", "change");
                    addEventTasks("mouseup", "change");
                    break;

                case "autosubmit":
                    addEventTasks("change", "submit");
                    break;
                }
            });
        }

        if (definition.enabledBy) {
            crossEventTasks(definition.enabledBy, "change", [
                ["enable", field]
            ]);
            crossEventTasks(definition.enabledBy, "form_load", [
                ["enable", field]
            ]);
        }

        if (definition.triggeredBy) {
            crossEventTasks(definition.triggeredBy, "change", [
                ["trigger", field]
            ]);
            crossEventTasks(definition.triggeredBy, "form_load", [
                ["trigger", field]
            ]);
        }

        if (definition.definedBy) {
            crossEventTasks(definition.definedBy, "change", [
                ["define", field]
            ]);
            crossEventTasks(definition.definedBy, "form_load", [
                ["define", field]
            ]);
        }

        if (definition.cloneTriggeredBy) {
            crossEventTasks(definition.cloneTriggeredBy, "change", [
                ["triggerClone", field]
            ]);
            crossEventTasks(definition.cloneTriggeredBy, "form_load", [
                ["triggerClone", field]
            ]);
        }

        $.each($.extend({}, definition.on, form.fieldEvents), addEventTasks);

        $.each(FIELD_EVENT_TYPES, function (i, evt) {
            addEventTasks(evt.toLowerCase(), definition["on" + evt]);
        });

        if ($.isEmptyObject(events)) {
            events = null;
        }

        form.field_events[field] = events;
    }

    /**
     * Generates the markup for the given field.
     * @param {Object} form The form definition.
     * @param {string} name Field name.
     * @param {boolean} forContainer Will the returns be in a container?
     * @param {string} contGrp The container group for tracking contents.
     * @param {boolean} clone Is this field part of a clone.
     * @return {Array} The markup.
     */
    function fieldMarkup(form, name, forContainer, contGrp, clone) {
        var m = [],
            s = $.form.settings.elements.field,
            d = form.fields[name],
            inputClass = "",
            out,
            label,
            input,
            values,
            hadVal;

        if (!d) {
            throw "jQuery.form: " + name + " is not a defined form input!"
        }

        if (d["class"] || d.className) {
            inputClass = cls(d["class"] || d.className);
        } else if (form.inputClass) {
            inputClass = cls(form.inputClass);
        }

        if (d.id) {
            inputClass += ".form-id";
        }

        if (form.baseInputClass) {
            inputClass += cls(form.baseInputClass);
        }

        // Handle special formatting types
        switch (d.type) {

        case "checkbox":
        case "radio":
            if (!d.values) {
                values = radioboxFromDef(form, s, name, d, inputClass);
            } else {
                label = d.label;
                values = [];
                if (d.checked && !$.isArray(d.checked)) {
                    d.checked = $.makeArray(d.checked);
                }
                if (d.value !== undefined && d.type === "radio") {
                    d.checked = [d.value];
                }
                $.each(d.values, function (k, v) {
                    if ($.isArray(d.values)) {
                        k = v;
                        if (form.localizationContext) {
                            v = "+" + v;
                        }
                    }
                    var c = false;
                    if (d.checked && $.inArray(k, d.checked) > -1) {
                        c = true;
                    }
                    values = values.concat(radiobox(form, s, d, d.type, name,
                            k, c, d.attr, v, inputClass, d.inputClass));
                });
            }
            break;

        default:
            label = d.label;
            input = [s.input[d.type] || s.input.text,
                            attr("name", d.asValue || name)];

            if (inputClass) {
                input.push(inputClass);
            }

            if (d.type === "select" || d.type === "multiple") {
                values = [];
                hadVal = {hadValue: false};
                if (d.placeholder) {
                    values.push([s.selectPlaceholder[d.type],
                            "." + loc(d.placeholder, form)]);
                }

                if (d.values) {
                    $.each(d.values, function (v, l) {
                        if ($.isPlainObject(l)) {
                            // OptionGroup
                            var o = [];
                            values.push("optgroup" +
                                    attr("label", loc(v, form)));
                            $.each(l, function (ov, ol) {
                                if ($.isArray(l)) {
                                    ov = ol;
                                    if (form.localizationContext) {
                                        ol = "+" + ol;
                                    }
                                }
                                o.push(optionMarkup(form, d, ov, ol, hadVal));
                            });
                            values.push(o);
                        } else {
                            if ($.isArray(d.values)) {
                                v = l;
                                if (form.localizationContext) {
                                    l = "+" + l;
                                }
                            }
                            values.push(optionMarkup(form, d, v, l, hadVal));
                        }
                    });
                }

                if (!hadVal.hadValue && d.placeholder) {
                    values[0][0] += "[selected]";
                }
            } else {
                if (d.placeholder) {
                    input.push(attr("placeholder", loc(d.placeholder, form)));
                }

                if (d.value !== undefined) {
                    if (d.type === "textarea") {
                        values = "." + loc(d.value, form);
                    } else {
                        input.push(attr("value", loc(d.value, form)));
                    }
                }
            }

            if (d.flags) {
                if ($.isArray(d.flags)) {
                    input.push("." + d.flags.join("."));
                } else {
                    input.push(cls(d.flags));
                }
            }

            if (d.disabled || d.enabledBy) {
                input.push(attr("disabled", "true"), ".keep-disabled");
            }

            if (d.fieldSize || form.fieldSize) {
                input.push(attr("size", d.fieldSize || form.fieldSize));
            }

            if (d.fieldSizeClass || form.fieldSizeClass) {
                input.push(cls(d.fieldSizeClass || form.fieldSizeClass));
            }

            if (d.attr) {
                $.each(d.attr, function (k, v) {
                    input.push(attr(k, v));
                });
            }
            break;
        }

        // Grab all special fields
        extractSpecialFields(form, name, d);

        // Add the input and value arrays into the return array
        if (input) {
            if (input.length) {
                input = input.join("");
            } else {
                input = "";
            }
            m.push(input);
        }

        if (d.triggeredBy) {
            m[0] += ".conditional-field.hide";
        }

        if (values && values.length) {
            if (!input) {
                m = m.concat(values);
            } else {
                m.push(values);
            }
        }

        // When in a container, simply return the input content
        if (!forContainer) {
            if (!form.simple) {
                if (d && d.cloneable) {
                    if (m[0].indexOf(".span") === -1) {
                        m[0] += ".span0";
                    }
                }

                out = [].concat(m);

                if (d.hint && !d.hintOutside) {
                    out.push(s.hint, "." + loc(d.hint, form));
                }

                if (d.help && d.helpInside) {
                    m.push(s.help, "." + loc(d.help, form));
                }

                if (s.container) {
                    // Elements are placed in a container
                    out = [s.container, out];
                }

                if (!label && form.localizationContext) {
                    label = "+" + name;
                }

                if (label) {
                    out = [s.labels.standard_container, [
                            s.labels.standard + attr("for", name),
                                "." + loc(label, form)
                            ]].concat(out);
                }

                if (d && d.cloneable) {
                    // If no span has been set for the clone, set a default
                    out.push($.form.settings.clones.spawner);
                    if (d.spawnerClass) {
                        out[out.length - 1][0] += cls(d.spawnerClass);
                    } else {
                        out[out.length - 1][0] += ".span1";
                    }
                }

                if (s.wrapper) {
                    // Everything is placed in a wrapper
                    m = [s.wrapper, out];
                    if (d.fieldClass) {
                        m[0] += cls(d.fieldClass);
                    }
                } else {
                    m = out;
                }

                if (d.hint && d.hintOutside) {
                    m.push(s.hint, "." + loc(d.hint, form));
                }

                if (d.help && !d.helpInside) {
                    m.push(s.help, "." + loc(d.help, form));
                }
            } else {
                if (label) {
                    // For simple forms, just add a label before the return.
                    m.unshift(s.labels.simple + attr("for", name),
                            "." + loc(label, form));
                }

                if (d && d.cloneable) {
                    m.push($.form.settings.clones.spawner);
                }
            }
        } else if (contGrp) {
            // Content group forms will exist only when used for validation
            if (form.groupContents[contGrp]) {
                form.groupContents[contGrp].push(name);
            }
            if (d.hint && d.hintInGroup) {
                m.push(s.hint, "." + loc(d.hint, form));
            }
            if (d.help && d.helpInGroup) {
                m.push(s.help, "." + loc(d.help, form));
            }
        }

        if (d && d.cloneable) {
            m = [$.form.settings.clones.container, m];
            if (d.spawnClass) {
                m[0] += cls(d.spawnClass);
            }
            if (d.onlyLastSpawner || d.singleSpawner) {
                m[0] += ".single-spawner";
            }
            if (d.cloneTriggeredBy) {
                m[0] += ".triggered-spawn";
            }
            m[0] += $.strf(".cloneable[data-max-clones={}]",
                $.isNumeric(d.cloneable) ? d.cloneable : -1);
        }

        if (d && d.rules && (clone || d.cloneable)) {
            d.rules.cloneRunner = true;
        }

        return m;
    }

    /**
     * Generates the markup for the given control.
     * @param {Object} form The form definition.
     * @param {string} name Control name.
     * @param {boolean} forContainer Will the returns be in a container?
     * @param {string} contGrp The container group for tracking contents.
     * @param {boolean} clone Is this field part of a clone.
     * @return {Array} The markup.
     */
    function controlMarkup(form, name, forContainer, contGrp, clone) {
        var m = [],
            input = [],
            s = $.form.settings.elements.controls,
            d = form.controls[name],
            controlLabel,
            label;

        switch (d.type) {

        case "reset":
            input.push(s.reset);
            break;

        case "submit":
            input.push(s.submit);
            break;

        case "link":
            input.push(s.link + (!!d.href ? "[href=" + d.href + "]" : ""));
            break;

        default:
            input.push(s.root);
            break;
        }

        extractSpecialFields(form, name, d);

        input.push(".form-controller");
        input.push(attr("name", name));
        if (d["class"] || d.className) {
            input.push(cls(d["class"] || d.className));
        }

        if (d.label) {
            label = loc(d.label, form);
            if (d.type === "submit") {
                input.push(attr("value", label));
            }
        } else if (d.label === undefined && form.localizationContext) {
            label = loc("+" + name, form);
        }

        if (d.controlLabel) {
            controlLabel = loc(d.controlLabel, form);
        }

        if (d.attr) {
            $.each(d.attr, function (k, v) {
                input.push(attr(k, v));
            });
        }

        m.push(input.join(""));
        if (label) {
            m.push("." + label);
        }

        if (d.controlLabel) {
            controlLabel = loc(d.controlLabel, form);
        }

        if (forContainer && contGrp) {
            form.groupContents[contGrp].push(name);
        } else {
            textElement("text", form, d, s, m,
                    d.preLabelClass || d.preLabelClassName, true);
            textElement(["hint", "help"], form, d, s, m,
                    d.postLabelClass || d.postLabelClassName);
            if (!form.simple) {
                m = [s.container, m];
                if (controlLabel) {
                    out = [s.labels.standard_container, [
                            s.labels.standard + attr("for", name),
                                "." + controlLabel
                            ]].concat(out);
                }
                m = [s.wrapper, m];
            } else if (controlLabel) {
                m.unshift(s.labels.simple + attr("for", name),
                        "." + controlLabel);
            }
        }

        return m;
    }

    /**
     * Returns the markup for a given form item.
     * @param {Object} form The form definition.
     * @param {string} type The type of markup needed (fieldset,group,field).
     * @param {string} name The name of the item needed.
     * Internal Use:
     *      @param {boolean} asArray Return the markup as an array.
     *      @param {boolean} forContainer Will the returns be in a container?
     *      @param {string} contGrp The container group.
     *      @param {boolean} clone Is this field part of a clone.
     * @return {Array|jQuery} A representation of the markup.
     */
    function markup(form, type, name, asArray, forContainer, contGrp, clone) {
        if (form.markup[type] === undefined) {
            form.markup[type] = {};
        }

        var m = form.markup[type],
            s = $.form.settings,
            f,
            p,
            o,
            l,
            c;
        if (m[name] === undefined) {
            switch (type) {

            case "messages":
                m[name] = s.elements.messages.container + ".form-messages";
                break;

            case "fieldset":
                m[name] = fieldsetMarkup(form, name, clone);
                break;

            case "group":
                m[name] = groupMarkup(form, name, clone);
                break;

            case "field":
                if (name.substr(0, 1) === "~") {
                    f = form.fields[name];
                    p = f.fieldsPrefix || "";
                    l = f.fieldsLabelPrefix || "";
                    o = $.extend({}, f);
                    c = [];

                    delete o.fields;
                    delete o.fieldsPrefix;
                    delete o.fieldsLabelPrefix;

                    $.each(f.fields, function (i, v) {
                        var fN = p + v;
                        form.fields[fN] = o;
                        if (l) {
                            form.fields[fN].label = l + ":" + fN;
                        }


                        if (m[fN] === undefined) {
                            m[fN] = fieldMarkup(form, fN, forContainer,
                                    contGrp, clone);
                        }
                        c.push(m[fN]);
                    });

                    m[name] = c;
                } else {
                    m[name] = fieldMarkup(form, name, forContainer, contGrp,
                            clone);
                }
                break;

            case "controls":
                m[name] = controlMarkup(form, name, forContainer, contGrp,
                        clone);
                break;
            }
        }

        return Boolean(asArray) ? m[name] : $$(m[name]);
    }

    /**
     * Resolves the markup type from an encoding character.
     * @param {Object} form The form.
     * @param {string} v The item being handled.
     * Internal Use:
     *      @param {boolean} asArray Return the markup as an array.
     *      @param {boolean} forContainer Will the returns be in a container?
     *      @param {string} contGrp The container group.
     *      @param {bool} clone Is this container a clone?
     * @return {Array|jQuery} A representation of the markup.
     */
    function resolveMarkup(form, v, asArray, forContainer, contGrp, clone) {
        var type = "field";
        switch (v.substr(0, 1)) {

        case "@":
            type = "messages";
            break;

        case "&":
            type = "fieldset";
            v = v.substr(1);
            break;

        case "+":
            type = "group";
            v = v.substr(1);
            break;

        case "*":
            type = "controls";
            v = v.substr(1);
            break;
        }

        return markup(form, type, v, asArray, forContainer, contGrp, clone);
    }

    //------------------------------
    // Form
    //------------------------------

    /**
     * Handles a form which is submitting.
     * @param {Object} form The form.
     * @param {jQuery} e The form element.
     * @param {Object} o Form object data.
     * @param {Array} a Form array data.
     */
    function formSubmitting(form, e, o, a) {
        e.find(".form-messages").empty();
        e.find(":input:not(.keep-disabled)")
            .attr("disabled", true).addClass("submit-disable");
        form.submitting.fire(o, e, a);
        e.trigger("submitted", [o, a])
    }

    /**
     * Handles a form which has finished submitting.
     * @param {Object} form The form.
     * @param {jQuery} The form element.
     */
    function formCompleted(form, e) {
        e.find(".current-mode :input:not(.keep-disabled)")
            .attr("disabled", false).removeClass("submit-disable");
        form.completed.fire();
    }

    /**
     * Creates a form result.
     * @param {string} name The form.
     * @param {string} type The type (success, error).
     * @param {string} mode The form mode.
     * @param {Object} data Data used to format response.
     * @param {number} code The error code returned.
     */
    function createMessage(name, type, mode, data, code) {
        var form = getForm(name),
            s = $.form.settings.elements.messages,
            e = $$(s[type]),
            m = form.messages[mode],
            title,
            text;

        // Set from the specific mode object
        if (m) {
            title = m[type + "Title"];
            if (code && m.codes) {
                text = m.codes[code];
            }
            if (!text) {
                text = m[type];
            }
        }

        // Set from the general object
        if (!title) {
            title = form.messages[type + "Title"];
        }
        if (!text) {
            if (code && form.messages.codes) {
                text = form.messages.codes[code];
            }
            if (!text) {
                text = form.messages[type];
            }
        }

        // Abort if the message isn't useful to send
        if (!title && !text) {
            return;
        }

        // Format the messages
        if (title) {
            title = loc(title, form);
            try {
                title = $.strf(true, title, data);
            } catch (e) {}
            $$([s.title, "." + title]).appendTo(e);
        }
        if (text) {
            text = loc(text, form);
            try {
                text = $.strf(true, text, data);
            } catch (e) {}
            if (title) {
                // Append a spacer
                e.append("&nbsp;");
            }
            if (s.text) {
                $$([s.text, "." + text]).appendTo(e);
            } else {
                e.append(text);
            }
        }

        form.element.find(".form-messages").html(e);
    }

    /**
     * Performs cleanup tasks on a completed form.
     * @param {Object} form The form.
     * @param {jQuery} e The form element.
     * @param {string} type The response type (success, error).
     * @param {Object} data The data object to populate messages.
     * @param {number?} code The error code, if applicable.
     */
    function formCleanup(form, e, type, data, code) {
        var mode = e.data("formMode"),
            actions,
            m;

        formMessage(e, type, mode, data, code);

        if (form.cleanup) {
            if (mode === "default") {
                mode = form.defaultMode;
            }

            m = form.cleanup[mode];
            if (m) {
                actions = m[type];
                if (!actions) {
                    actions = m.generic;
                }
            }

            if (!actions && form.cleanup.common) {
                actions = form.cleanup.common[type];
                if (!actions) {
                    actions = form.cleanup.common.generic;
                }
            }

            if (actions) {
                if (code && actions.codes && actions.codes[code]) {
                    actions = actions.codes[code];
                }

                $.each(actions, function (action, value) {
                    switch (action) {

                    case "close":
                        if (form.lightbox) {
                            $.lightbox.close(form.lightbox);
                        }
                        break;

                    case "redirect":
                        window.location = $.strf(true, value, data);
                        break;

                    case "redirect_onClose":
                    case "redirect-onClose":
                        if (form.lightbox) {
                            $.lightbox.one("closed.lightbox", function () {
                                window.location = $.strf(true, value, data);
                            });
                        }
                        break;

                    case "reload":
                        if (value) {
                            ($.deeplink || window.location).reload();
                        }
                        break;

                    case "reload_onClose":
                    case "reload-onClose":
                        if (value && form.lightbox) {
                            $.lightbox.one("closed.lightbox", function () {
                                ($.deeplink || window.location).reload();
                            });
                        }
                        break;

                    case "reset":
                        if (e.data().validator) {
                            e.data().validator.resetForm();
                        } else {
                            e[0].reset();
                        }
                        break;

                    case "clear":
                        if (value === "*") {
                            e.find(":input").val("");
                        } else {
                            if (!$.isArray(value)) {
                                value = [value];
                            }

                            $.each(value, function (i, n) {
                                e.find(":input[name='" + n + "']").val("");
                            });
                        }
                        break;

                    case "mode":
                        if (typeof value === "string") {
                            value = {
                                mode: value,
                                keepMessages: true,
                                data: undefined
                            };
                        }

                        if (value.keepMessages === undefined) {
                            value.keepMessages = true;
                        }

                        formMode(form.name, value.mode, value.data,
                                value.keepMessages);
                        break;

                    case "invoke":
                        if ($.isFunction(value)) {
                            value();
                        }
                    }
                });
            }
        }

        formCompleted(form, e);
    }

    /**
     * Handles a successful submit.
     * @param {jQuery} e The form submitted.
     * @param {Object} data The response.
     */
    function formSuccess(e, data) {
        var form = e.data("jQueryForm");
        if (!form) {
            return;
        }
        form = getForm(form);
        formCleanup(form, e, "success", data);
        form.successful.fire(data);
    }

    /**
     * Handles a failed submit.
     * @param {jQuery} e The form.
     * @param {number} code The error code.
     * @param {string} p The error payload.
     */
    function formError(e, code, p) {
        var form = e.data("jQueryForm");
        if (!form) {
            return;
        }
        form = getForm(form);
        formCleanup(form, e, "error", p, code);
        form.failure.fire(code);
    }

    /**
     * Sets a message in the form.
     * @param {jQuery} e The form.
     * @param {string} type The type of message to show.
     * @param {string} mode The mode the form is in.
     * @param {Object?} data The data to use for formatting.
     * @param {number} code The http error code.
     */
    function formMessage(e, type, mode, data, code) {
        var form = e.data("jQueryForm");
        if (!form) {
            return;
        }
        createMessage(form, type, mode, data, code);
    }

    /**
     * Handle the jQuery validator.
     * @param {jQuery} e The form to handle.
     * @param {boolean} True if valid.
     */
    function validates(e) {
        var v = e.data("validator");
        if (!v) {
            return true;
        }
        return v.form();
    }

    function hideFieldWrapper(event, hide) {
        var e = $(event.target).parents(".form-field-wrapper");
        if (hide) {
            e.addClass("hide");
        } else {
            e.removeClass("hide");
        }
    }

    /**
     * The submit handler for a form.
     * @param {Event} event
     */
    function onSubmit(event) {
        var e = $(this),
            form = e.data("jQueryForm"),
            action = e.attr("action"),
            p, a, o, f,
            proxy = "apiProxy-";

        // Only work on forms we manage
        if (!form) {
            return;
        }
        form = getForm(form);

        // Only work on valid forms
        if (!validates(e)) {
            if (event) {
                event.preventDefault();
            }
            return;
        }

        a = e.serializeArray();
        o = e.serializeObject();

        // If provided, format the data before sending
        if ($.isFunction(form.formatter)) {
            form.formatter(o, a);
        }

        formSubmitting(form, e, o, a);

        switch (e.attr("method").toLowerCase()) {

        case "api":
            proxy += e.data("formMode");
            p = e.data(proxy);
            if (!p) {
                p = $.api(action, true);
                p.bind(function (d) { $.form.success(e, d); },
                        function (c, p) { $.form.error(e, c, p); });
                e.data(proxy, p);
            }
            p(o);
            break;

        case "callback":
            if (callbacks[action]) {
                callbacks[action].fire(o, e, a);
            }
            break;

        case "route":
            formCompleted(form, e);

            if (form.routeFields) {
                if (!$.isArray(form.routeFields)) {
                    form.routeFields = $.makeArray(form.routeFields);
                }

                f = {};
                $.each(form.routeFields, function (i, v) {
                    f[v] = o[v];
                });
            } else {
                f = o;
            }

            if ($.deeplink) {
                $.deeplink.setRoute($.deeplink.matchToURL(f, action));
            } else {
                if (!$.isEmptyObject(f)) {
                    if (action.indexOf("?") > -1) {
                        action += "&" + $.param(f);
                    } else {
                        action += "?" + $.param(f);
                    }
                }
                window.location.href = action;
            }
            break;

        case "noop":
            // Just break, nothing special
            break;

        default:
            return;
        }

        if (event) {
            event.preventDefault();
        }
    }

    /**
     * Returns a form. Wrapper provides a place to throw un exception.
     * @param {string} name The name of the form.
     * @return {Object} The definition for the form.
     */
    function getForm(name) {
        var f = forms[name];
        if (f === undefined) {
            throw name + " is not a defined form";
        }

        return f;
    }

    /**
     * Gets the owning form for an element; returns null if none.
     * @param {jQuery} e An element.
     * @return {Object=} The form.
     */
    function getOwningForm(e) {
        var f = e.parents("form");
        if (f.length) {
            f = f.data("jQueryForm");
            if (f) {
                return forms[name] || null;
            }
        }

        return null;
    }

    /**
     * Returns the identifier for a form, given some name.
     * @param {string} name The form.
     * @param {string?} layout The form layout.
     */
    function formId(name, layout) {
        var s = $.form.settings,
            a = [];

        if (s.id.prefix) {
            a.push(s.id.prefix);
        }

        a.push(name.replace(RX_S, s.id.separator));

        if (layout) {
            a.push(layout);
        }

        return a.join(s.id.separator);
    }

    /**
     * Defines a form.
     * @param {string} name The name of the form.
     * @param {Object} settings The settings for the form.
     */
    function defineForm(name, settings) {
        var form = forms[name],
            onlyOne,
            defaultLayout,
            autoControls;

        if (form !== undefined) {
            // If the form was generated, destroy it.
            if (form.element && form.generated) {
                form.element.remove();
            }
        }

        // Fields must be defined
        if (!settings.fields) {
            throw name + " has no defined fields";
        }

        // Define default object fields.
        $.each(DEFAULT_DEF_BLOCKS, function (i, v) {
            if (!settings[v]) {
                settings[v] = {};
            }
        });

        // Reformat flags
        $.each(["flags", "fieldFlags"], function (i, v) {
            if (settings[v] && !$.isArray(settings[v])) {
                settings[v] = $.unique(settings[v].split(" "));
            }
        });

        // Reformat the action handling
        if (!settings.actions) {
            settings.actions = {
                "construct": "/",
                "default": "/"
            };
            settings.defaultMode = "construct";
        } else if (!settings.actions["default"]) {
            onlyOne = null;
            $.each(settings.actions, function (k, v) {
                if (onlyOne === null) { onlyOne = k; }
                else { onlyOne = false; return false; }
            });
            if (onlyOne) {
                settings.defaultMode = onlyOne;
                settings.actions["default"] = settings.actions[onlyOne];
            } else if (settings.actions.construct) {
                settings.actions["default"] = settings.actions.construct;
                settings.defaultMode = "construct";
            }
        }
        if (settings.action) {
            settings.actions["default"] = settings.action;
            settings.actions[settings.defaultMode] = settings.action;
            delete settings.action;
        }

        if (!settings.defaultMode) {
            settings.defaultMode = "construct";
        }

        // Reformat the method handling
        if (!settings.methods) {
            settings.methods = {
                "default": "POST"
            };
        }
        if (settings.method) {
            settings.methods["default"] = settings.method;
            delete settings.method;
        }

        // Create a special handler proxy binder for callback forms
        $.each(settings.methods, function (k, v) {
            if (v === "CALLBACK") {
                settings.handle = function (cb) {
                    var f = getForm(name);
                    formCallback(f.actions[k], cb);
                    return f;
                };
                return false;
            }
        });

        if (settings.layout && typeof settings.layout === "string") {
            settings.layout = settings.layout.split(" ");
        }

        // Reformat the layout
        if (!settings.layout || $.isArray(settings.layout)) {
            if ($.isArray(settings.layout)) {
                defaultLayout = settings.layout;
            }
            settings.layout = {};
            settings.layout[settings.defaultMode] = defaultLayout;
        }
        if (!settings.layout[settings.defaultMode]) {
            if (settings.layout.common) {
                settings.layout[settings.defaultMode] = [];
            } else {
                // If no layout is provided, use iteration order (which
                // provides no ordering guarantees)
                settings.layout[settings.defaultMode] = $.map(settings.fields,
                    function (v, k) {
                        return k;
                    });

                // Add a messages block at the top of the form.
                settings.layout[settings.defaultMode].unshift("@");

                autoControls = $.map(settings.controls, function (v, k) {
                    return "*" + k;
                });

                if (autoControls.length) {
                    settings.groups.autocontrols = autoControls.join(" ");
                    settings.layout[settings.defaultMode]
                            .push("+autocontrols");
                }
            }
        }
        if (!settings.layout["default"]) {
            settings.layout["default"] = settings.layout[settings.defaultMode];
        }

        // Define the read-only forms
        if (settings.readOnly === undefined) {
            settings.readOnly = ["delete", "remove"];
        }

        // Create/clear the markup list for a form
        settings.markup = {};

        // Create the binding handlers
        settings.submitting = $.Callbacks("unique");
        settings.successful = $.Callbacks("unique");
        settings.failure = $.Callbacks("unique");
        settings.completed = $.Callbacks("unique");

        // Set the name for reference
        settings.name = name;

        // Add a special element proxy for context selectors
        settings.$ = function (selector) {
            return $(selector, getForm(name).element);
        };

        forms[name] = $.extend({}, settings);
    }

    /**
     * Binds listener(s) to form events.
     * @param {string} name The form.
     * @param {function(Object)} success
     * @param {function()} failure
     * @param {function(boolean, Object)} complete
     * @param {function(Object, jQuery, Array)} submit
     */
    function bindForm(name, success, failure, complete, submit) {
        var form = getForm(name);
        $.each({submit: submit, successful: success, failure: failure,
                    complete: complete},
            function (k, v) {
                if ($.isFunction(v)) {
                    form[k].add(v);
                }
            });
    }

    /**
     * Binds a named callback handler to process CALLBACK methods.
     * Forms which use CALLBACK handling must close the submit loop for a form
     * by calling jQuery[formSuccess|formError](form_name) when done.
     * @param {string} name The form.
     * @param {function(data)} The form callback handler. Receives form data.
     */
    function formCallback(name, fn) {
        if (!callbacks[name]) {
            callbacks[name] = $.Callbacks("unique");
        }
        if ($.isFunction(fn)) {
            callbacks[name].add(fn);
        }
    }

    /**
     * Switch the mode of a form.
     * @param {string} name The form.
     * @param {string} mode The mode to use.
     * @param {Object} data The data to seed the form with.
     */
    function formMode(name, mode, data, keepMessages) {
        var form = getForm(name),
            e = form.element,
            action = form.actions[mode] || form.actions["default"],
            method = form.methods[mode] || form.methods["default"],
            active,
            currentMode = e.data("formMode"),
            validator = e.data().validator;

        if (mode === "default") {
            mode = form.defaultMode;
        }

        // Always reset when changing modes
        if (!keepMessages) {
            e.find(".form-messages").empty();
        }

        e.find("[data-form-val]").removeAttr("data-form-val");

        // Just do the reset if we need to, don't swap modes if we don't need
        if (validator) {
            validator.resetForm();
        }
        e[0].reset();

        if (currentMode === mode) {
            active = e.find(".current-mode");
        } else {
            e.data("formMode", mode);
            e.attr({
                action: action,
                method: method
            });

            e.find(".form-body").removeClass("current-mode").hide()
                .find(":input").attr("disabled", "disabled");
            active = $($.strf("#{}, #{}",
                    formId(name, "common"), formId(name, mode)))
                .show().addClass("current-mode");

            if (!form.readOnly || $.inArray(mode, form.readOnly) === -1) {
                active.find(":input:not(.keep-disabled)")
                    .removeAttr("disabled");
            }

            // The active form ID should always be enabled
            // (for things like delete)
            active.find(".form-id").removeAttr("disabled");

            // Show controls even in read only mode
            active.find(".form-controller:not(.keep-disabled)")
                .removeAttr("disabled");

            active.find(":input").trigger("form_mode", mode);
        }

        sendFormPreReadyEvents(active);

        data = handleClones(active, data);

        if (data) {
            $.each(data, function (key, value) {
                var e = active.find($.strf("[name={0}]", key));

                if (e.is(":checkbox, :radio")) {
                    e.filter("[value='" + value + "']").attr("checked", true);
                } else {
                    e.val(value);
                }

                if (e.is("select, :checkbox, :radio")) {
                    e.attr("data-form-val", value).change();
                }
            });
        }

        sendFormReadyEvents(active);
    }

    /**
     * Fires off any events necessary for a form to pre-ready.
     * @param {jQuery} context The context to search within.
     */
    function sendFormPreReadyEvents(context) {
        context.find(":input:not([disabled])").trigger("form_preload");
    }

    /**
     * Fires off any events necessary for a form to ready.
     * @param {jQuery} context The context to search within.
     */
    function sendFormReadyEvents(context) {
        context.find(":input:not([disabled])").trigger("form_load");
    }

    /**
     * Handles the clone setup for a given form's mode.
     * @param {jQuery} active The active form.
     * @param {Object} data The data to display in the form.
     */
    function handleClones(active, data) {
        active.find(".spawn-container").each(function () {
            var e = $(this).resetTemplate(),
                instances;

            e.find(".spawn, .despawn").prop("disabled", true);

            spawnClone(e, 0)
                .find(".despawn")
                    .addClass("keep-disabled").prop("disabled", true);

            // Determine if we're setting data for clones
            if (data !== undefined) {
                data = $.extend({}, data);
                instances = e.find(":input:not(.spawn):not(.despawn)");
                $.each(instances, function (i, v) {
                    var name = $(v).attr("name");
                    if (data[name] !== undefined) {
                        if ($.isArray(data[name])) {
                            // The data should be an array for cloned types
                            $.each(data[name], function (i, v) {
                                spawnClone(e, i).find("[name='" + name + "']")
                                    .val(v)
                                    .filter("select, :checkbox, :radio")
                                        .attr("data-form-val", v)
                                        .change();
                            });
                        }

                        delete data[name];
                    }
                });
            }

            cleanupClone(e);
        });

        return data;
    }

    /**
     * Generates a form body.
     * @param {string} name The form.
     * @param {string} layout The layout to generate.
     * @param {jQuery} e The element.
     */
    function formBody(name, layout, e) {
        var form = getForm(name),
            c = $$("div.form-body.clearfix#" + formId(name, layout))
                    .appendTo(e);
        $.each(form.layout[layout], function (i, v) {
            c.append(resolveMarkup(form, v));
        });
    }

    function resolveField(e, field, form, sel) {
        var fn = sel || "[name=" + field + "]",
            f = e.parents(".field-spawn-container");

        if (!f.length) {
            f = e.parents(".spawn-container");
        }

        if (f.length) {
            if (!f.is(fn)) {
                f = f.find(fn);
            }
        } else {
            f = form.$(fn);
        }

        return f;
    }

    function enableField(by, field, form) {
        var e = $(by),
            v = e.val(),
            d = form.fields[field],
            f = resolveField(e, field, form),
            valid = false;

        if (e.is(":radio, :checkbox")) {
            if (d.enabledOnValue && v !== d.enabledOnValue) {
                return;
            }

            if (!e.prop("checked")) {
                v = "";
            }
        }

        if (!d.enabledOnValue || d.enableOnAnyValue) {
            valid = !!v;
        } else {
            valid = (v === d.enabledOnValue);
        }

        f.prop("disabled", !valid);
        if (valid) {
            f.removeClass("keep-disabled");
        } else {
            f.addClass("keep-disabled");
        }
        f.change();
    }

    function triggerClone(by, field, form) {
        var e = $(by).addClass("clone-spawn-trigger"),
            v = e.val(),
            p = e.parents(".spawn-container"),
            count = p.activeTemplates().length,
            d = form.fields[field] || form.groups[field],
            f = resolveField(e, field, form, ".active-spawner"),
            valid = false;

        if (e.is(":radio, :checkbox")) {
            if (!e.prop("checked")) {
                v = "";
            }
        }

        if (!d.triggeredOnValue || d.triggerOnAnyValue) {
            valid = !!v;
        } else {
            valid = (v === d.triggeredOnValue);
        }

        if (valid) {
            f.show()
                .find(".spawn")
                    .removeClass("keep-disabled")
                    .prop("disabled", false);
        } else {
            if (count > 1) {
                f.show()
                    .find(".spawn")
                        .addClass("keep-disabled")
                        .prop("disabled", true);
            } else {
                f.hide();
            }
        }
    }

    function triggerField(by, field, form) {
        var e = $(by),
            v = e.val(),
            d = form.fields[field],
            f = resolveField(e, field, form),
            valid = false;

        if (e.is(":radio, :checkbox")) {
            if (!e.prop("checked")) {
                v = "";
            }
        }

        if (!d.triggeredOnValue || d.triggerOnAnyValue) {
            valid = !!v;
        } else {
            valid = (v === d.triggeredOnValue);
        }

        if (valid) {
            f.removeClass("hide");
        } else {
            f.addClass("hide");
        }

        f.trigger("hide-field", [!valid]);
    }

    function defineField(by, field, form) {
        var e = $(by),
            v = e.val(),
            d = form.fields[field].definitions,
            f = resolveField(e, field, form);

        f.purgeAddedOptions();
        if (v && d) {
            f.addOption(d[v]);
        }

        f.find(".option-placeholder").prop("disabled", false);
        f.val(f.attr("data-form-val") || "").change();
        if (f.val() === null) {
            f.val("").change();
        }
        f.find(".option-placeholder").prop("disabled", true);
    }

    /**
     * Creates a tasker function to handle bound events based on task/type.
     * @param {string} task The task.
     * @return {function?} The tasker function.
     */
    function tasker(task, form) {
        if ($.isFunction(task)) {
            return task;
        }

        var tv;
        if ($.isArray(task)) {
            tv = task[1];
            task = task[0];
        }

        switch (task) {

        case "enable":
            return function () {
                enableField(this, tv, form);
            }

        case "trigger":
            return function () {
                triggerField(this, tv, form);
            }

        case "triggerClone":
            return function () {
                triggerClone(this, tv, form);
            }

        case "define":
            return function () {
                defineField(this, tv, form);
            }

        case "submit":
            return function () {
                $(this).parents("form").submit();
            }

        case "change":
            return function () {
                $(this).change();
            }

        default:
            return null;
        }
    }

    function spawnClone(c, count) {
        var n = c.update(count),
            max = parseInt(c.data("max-clones"), 10),
            isMax = (count + 1) === max;

        n.siblings().find(".spawn, .despawn").prop("disabled", true);
        n.find(".spawn").prop("disabled", isMax);
        n.find(":input").trigger("clone_spawn", (count + 1), count)
                .filter(":not(.keep-disabled)")
                    .prop("disabled", false);
        return n;
    }

    function despawnClone(c, index) {
        var o = c.templateInstance(index - 1);
        c = c.resetTemplateInstance(index);
        c.find(":input").trigger("clone_despawn")
            .filter(":not(.keep-disabled)")
                .prop("disabled", true);
        c.find(":input").val("").change();
        o.find(".spawn").prop("disabled", false);
        if (index - 1 > 0) {
            o.find(".despawn").prop("disabled", false);
        }
    }

    function cleanupClone(c) {
        var single = c.is(".single-spawner"),
            triggered = c.is(".triggered-spawn"),
            e;

        c = c.activeTemplates();
        c.find(":input").trigger("clone_update", [c.length]);
        if (single) {
            c.find(".spawner").removeClass("active-spawner").hide();
            e = c.last().find(".spawner").addClass("active-spawner").show();
            if (triggered) {
                c.find(".clone-spawn-trigger").change();
            }
        } else {
            c.find(".spawner").show().addClass("active-spawner");
        }
    }

    /**
     * Builds a form and appends it to the container.
     * @param {string} name The form.
     */
    function buildForm(name) {
        var form = getForm(name),
            s = $.form.settings,
            e,
            validations = {};

        if (form.element && form.generated) {
            // If a form element already exists, remove it
            form.element.remove();
            form.element = null;
            form.generated = false;
        }

        // Create the form
        form.generated = true;
        e = form.element = $$("form#" + formId(name))
                .data("jQueryForm", name)
                .addClass(form["class"] || form.className);

        // Add in the form header
        if (form.title) {
            $$("div.form-header", [
                s.elements.title, "." + loc(form.title, form)
            ]).appendTo(e);
        }

        // Create a storage for field events
        form.field_events = {};

        // Create the common form layout first
        if (form.layout.common) {
            formBody(name, "common", e);
        }

        // Create the various form layouts
        $.each(form.layout, function (layout, order) {
            if (layout !== "common" && layout !== "default") {
                formBody(name, layout, e);
            }
        });

        // Bind special flags
        formFlags(e);

        // Add field events
        $.each(form.field_events, function (field, fieldEvents) {
            if (!fieldEvents) {
                return
            }

            $.each(fieldEvents, function (event, events) {
                $.each(events, function (i, value) {
                    e.find("[name=" + field + "]")
                        .on(event, tasker(value, form));
                });
            });
        });
        delete form.field_events;

        if (form.onFieldEvents) {
            e.find(form.onFieldSelector || ":input").on(form.onFieldEvents);
        }
        e.find(".conditional-field").on("hide-field", hideFieldWrapper);

        if (form.forFieldEvents) {
            $.each(form.forFieldEvents, function (selector, events) {
                e.find(selector).on(events);
            });
        }

        e.find(".spawn").on("click", function () {
            var s = $(this),
                c = s.parents(".spawn-container"),
                max,
                count,
                n;

            if (c.length > 0) {
                max = parseInt(c.data("max-clones"), 10);
                count = c.activeTemplates().length;

                if (max === -1 || count < max) {
                    n = spawnClone(c, count);
                    sendFormReadyEvents(n);
                }

                cleanupClone(c);
            }
        });

        e.find(".despawn").on("click", function () {
            var s = $(this),
                c = s.parents(".spawn-container"),
                count,
                o;

            if (c.length > 0) {
                count = c.activeTemplates().length;
                despawnClone(c, count - 1);

                cleanupClone(c);
            }
        });

        e.find(".spawn-container").templateContainer();

        // Handle field flags
        if (form.flags) {
            $.each(form.flags, function (i, flag) {
                switch (flag) {

                // Use form data as success data
                case "autocomplete":
                    e.on("submitted", function (event, data) {
                        e.formSuccess(data);
                    });
                    break;

                // Fail with a 599 and use form data as error payload
                case "autofail":
                    e.on("submitted", function (event, data) {
                        e.formError(599, data);
                    });
                    break;

                }
            });
        }

        // Set up the form validations
        validations.rules = {};
        validations.messages = {};
        $.each(form.fields, function (name, vals) {
            if (vals.rules) {
                validations.rules[name] = vals.rules;
            }
            if (vals.messages) {
                if ($.isPlainObject(vals.messages)) {
                    validations.messages[name] = {};
                    $.each(vals.messages, function (mn, mv) {
                        validations.messages[name][mn] = loc(mv, form);
                    });
                } else {
                    validations.messages[name] = loc(vals.messages, form);
                }
            }
        });
        if (form.groupContents) {
            validations.groups = {};
            $.each(form.groupContents, function (k, v) {
                validations.groups[k] = v.join(" ");
            });
        }
        if (!$.isEmptyObject(validations.rules)) {
            validations.submitHandler = function (form) {
                onSubmit.apply(form);
            };
            e.validate($.extend(true, {}, form.validation, validations));
        } else {
            e.on("submit", onSubmit);
        }

        // Set in a lightbox, if applicable
        if (form.lightbox) {
            $.lightbox(form.lightbox, e, form.lightboxFlags);
            e.on("loading.lightbox", function (event, trigger) {
                if (!trigger) {
                    return;
                }

                var mode = trigger.data("formMode") || "default",
                    entityId = trigger.data("entityId"),
                    entity = trigger.data("entity"),
                    data;

                if (mode) {
                    if (!entity) {
                        entity = form.entity;
                    }

                    // Attempt to fetch the entity from the database
                    if (entity && $.database) {
                        data = $.database[entity];
                        if (data && entityId !== undefined) {
                            data = data[entityId];
                        } else {
                            data = undefined;
                        }
                    }

                    // Set form data only after loading is finished
                    e.one("loaded.lightbox", function () {
                        formMode(name, mode, data);
                    });
                }
            });
        } else {
            e.appendTo(form.container);
        }

        e.find(":input").trigger("form_create");

        // Set the default form mode
        formMode(name, "default");

        // Trigger any change events
        e.find("select, :checkbox, :radio").trigger("change");
    }

    /**
     * Interface for form control.
     * @param {string} name The name of the form to work with.
     *
     * Define:
     * @param {Object} defs The Definition object.
     * - OR -
     * @param {string} call An API call which returns a form def.
     *
     * Build:
     * @param {string|jQuery} container The form container.
     * @param {boolean} build Generate the unbuilt form?
     *
     * Result bind:
     * @param {function(Object)=} success
     * @param {function()=} error
     * @param {function()=} complete
     * @param {function(Object)=} submit
     *
     * @return {Object} The form definition.
     */
    function form(var_args) {
        var args = $.makeArray(arguments),
            name = args.shift(),
            form,
            container,
            argparse = {},
            f;

        $.each(args, function (i, v) {
            var t = (v instanceof jQuery) ? "jquery" : $.type(v);

            // Nulls offset function pointers
            if (t === "null") {
                t = "function";
            }

            if (argparse[t]) {
                argparse[t].push(v);
            } else {
                argparse[t] = [v];
            }
        });

        // Define a new form
        if (argparse.object) {
            defineForm(name, argparse.object.shift());
        }

        // Grab the form object (throws error if undefined)
        form = getForm(name);

        // Handle the container
        if (argparse.jquery) {
            // Set a container
            container = argparse.jquery.shift();
        } else if (argparse.string) {
            // Fetch a container
            container = $(argparse.string.shift());
        }

        if (!form.container && container && container.length) {
            form.container = container;
            if (!form.lightbox && form.element) {
                form.element.appendTo(form.container);
            }
        }

        // Build the form
        if (argparse["boolean"]) {
            if (argparse["boolean"].shift() && !form.element) {
                buildForm(name);
            }
        }

        // Bind event handlers
        f = argparse["function"];
        if (f && f.length) {
            bindForm(name, f.shift(), f.shift(), f.shift(), f.shift());
        }

        return form;
    }

    //------------------------------
    // Inputs
    //------------------------------

    /**
     * Returns a mapped array of option values.
     * @param {jQuery} e The select.
     * @param {string} selector The selector to grab.
     * @return {Array<string>} The values selected.
     */
    function selectMapper(e, selector) {
        return e.find(selector).map(function () {
            return $(this).val();
        });
    }

    /**
     * Returns the option values for a select.
     * @param {jQuery} e The select.
     * @param {boolean} structured Return an object of values and groups.
     * @return {Array<string>|Object<string, string|Object> An array of all
     * values or an object of values, labels, and groups.
     */
    function optionValues(e, structured) {
        if (!structured) {
            return selectMapper(e, "option");
        }

        var r = {};
        e.children().each(function () {
            var e = $(this);
            if (e.is("option")) {
                r[e.val()] = e.html();
            } else if (e.is("optgroup")) {
                c = r[e.attr("label")] = {};
                e.children().each(function () {
                    var oe = $(this);
                    c[oe.val()] = oe.html();
                });
            }
        });

        return r;
    }

    /**
     * Turn an array of values into an object whose keys are values.
     */
    function expandArray(a, useKeys) {
        var o = {};
        $.each(a, function (i, v) {
            if (useKeys) {
                o[i] = v;
            } else {
                o[v] = v;
            }
        });

        return o;
    }

    /**
     * Turn an array into a plain object with the same keys and values.
     */
    function arrayToObject(a) {
        return expandArray(a, true);
    }

    /**
    * Adds options to a select.
    * @param {jQuery} e The select.
    * @param {string|Object<string, string>} value The option value or a list
    * of options:values to add.
    * @param {string=} name The option name, if adding one option.
    * @param {string=} group The optgroup name to add to.
    */
    function addOption(e, value, name, group) {
        if ($.isArray(value)) {
            addOption(e, expandArray(value), name, group);
            return;
        } else if ($.isPlainObject(value)) {
            $.each(value, function (k, v) {
                if ($.isPlainObject(v)) {
                    $.each(v, function (ok, ov) {
                        addOption(e, ok, ov, k);
                    });
                } else {
                    addOption(e, k, v, group);
                }
            });

            return;
        }

        var form = getOwningForm(e),
            a,
            n = loc(name, form),
            g = loc(group, form), gs,
            o = $$("option").val(value).html(n),
            d = e.data("form_data") || {},
            x;

        if (!d.added) {
            d.added = {groups: [], options: []};
        }

        if (g) {
            gs = g.toLowerCase();
            group = $($.grep(e.find("optgroup"), function (v, k) {
                return $(v).attr("label").toLowerCase() === gs;
            }));
            if (!group.length) {
                group = $$("optgroup").attr("label", g).appendTo(e);
                d.added.groups.push(group[0]);
            } else {
                group = group.eq(0);
            }

            a = group;
        } else {
            a = e;
            d.added.options.push(o[0]);
        }

        e.data("form_data", d);
        a.append(o);

        x = e.data("form-val");
        if (x) {
            e.val(x);
        }
    }

    /**
     * Remove an option from a select by a value.
     * @param {jQuery} e The select.
     * @param {string|Array<string>} v The value(s) to remove.
     * @param {boolean=} group Is this a group being removed?
     */
    function removeOption(e, v, group) {
        if ($.isArray(v)) {
            $.each(v, function (i, val) {
                removeOption(e, val, group);
            });

            return;
        }

        $(group ? "optgroup" : "option", s).each(function () {
            var e = $(this);
            if ((group ? e.attr("label") : e.val()) === v) {
                e.remove();
            }
        });

        if (d.added) {
            rem.each(function () {
                var x = group ? "groups" : "options",
                i = $.inArray(this, d.added[x]);
                if (i > -1) {
                    d.added[x].splice(i, 1);
                }
            });
            s.data("form_data", d);
        }
    }

    /**
     * Purges all added options from a select.
     * @param {jQuery} e The select.
     */
    function purgeAddedOptions(e) {
        var d = e.data("form_data");

        if (d && d.added) {
            $.each(d.added, function (t, l) {
                $.each(l, function (i, o) {
                    $(o).remove();
                });
            });

            d.added.groups = [];
            d.added.options = [];

            e.data("form_data", d);
        }
    }

    /**
     * Binds special event handlers based on the presence of classes.
     */
    function formFlags(context) {
        var e = $("form", context);
        if (context !== undefined && $(context).is("form")) {
            e = e.add(context);
        }

        e.each(function () {
            // @TODO: Check for any form flags?
            // @TOOD: Merge this with other flag function?
            var f = $(this);

            // self-select selects all the contents on blur
            f.find("input.self-select, textarea.self-select")
                .on("click", function () {
                    this.select();
                });

            // focus-start
            f.find(":input.focus-start").focus();
        });
    }

    //------------------------------
    // Validations
    //------------------------------

    /**
     * Gets all the clones of an element.
     * @param {HTMLElement} The element.
     * @param {boolean} inv Invert the direction (get previous siblings).
     * @return {jQuery} The elements.
     */
    function getClones(elem, inv) {
        var e = $(elem),
            w = e.parents(".template"),
            byName = $.strf(":input[name='{}']", e.attr("name")),
            siblings = w[inv ? "prevAll" : "nextAll"](".active-template");
        return siblings.find(byName).not(e);
    }

    /**
     * Gets all the values for the clones of an element.
     * @param {HTMLElement} The element.
     * @return {Array<string>} The element values.
     */
    function cloneVals(elem) {
        var vals = [];

        getClones(elem, true).each(function () {
            vals.push($(this).val());
        });

        return vals;
    }

    /**
     * The jQuery.validate plugin specifically stops cloned elements from
     * being all validated. This "validation" method is applied automatically
     * to all cloned elements. This function simply runs the validation against
     * all elements of this type.
     */
    function cloneRunner(v, elem) {
        var jqv = this;

        getClones(elem).each(function () {
            jqv.check(this);
        });

        return true;
    }

    /**
     * Ensures uniqueness among the clones.
     * @param {string} The value of the field.
     * @param {HTMLElement} elem The field.
     * @param {*} param The params provided for the validation.
     */
    function cloneUnique(value, elem, param) {
        return $.inArray($(elem).val(), cloneVals(elem)) === -1;
    }

    /**
     * Ensures that cloneable elements are required but only one instance.
     * @param {string} The value of the field.
     * @param {HTMLElement} elem The field.
     * @param {*} param The params provided for the validation.
     */
    function requireOne(value, elem, param) {
        var hasOne = false;
        $(elem).parents("form").find("[name=" + elem.name + "]")
            .each(function (i, e) {
                if ($(e).val()) {
                    hasOne = true;
                    return false;
                }
            });
        return hasOne;
    }

    /**
     * Quick test to determine if the clone is the last in a parent.
     * @param {elem} The element to test.
     */
    function isLastClone(elem) {
        return $(elem).parentsUntil(".spawn-container")
                .nextAll(".active-template").length === 0;
    }

    /**
     * Allows for mathematical comparison using clones.
     * @param {string} The value of the field.
     * @param {HTMLElement} elem The field.
     * @param {*} param The params provided for the validation. Options:
     *      [number, "equals*|lt(min)|gt(max)|lte|gte"] <-- Sum compared to
     *      [number, number, "inclusive*|exclusive"]    <-- Sum in range of
     */
    function cloneNumeric(value, elem, param) {
        // Only validate the last element in a cloneNumeric check
        if (!isLastClone(elem)) {
            return true;
        }

        var vals = cloneVals(elem),
            n = parseFloat($(elem).val(), 10),
            val,
            val2,
            combine,
            compare;

        if (!$.isArray(param)) {
            param = $.makeArray(param);
        }

        val = parseFloat(param[0], 10);

        if (param.length === 1) {
            compare = "equals";
        } else if (param.length >= 2) {
            if ($.isNumeric(param[1])) {
                val2 = parseFloat(param[1], 10);
                compare = param[2] || "inclusive";
            } else {
                compare = param[1];
            }
        }

        $.each(vals, function (i, v) {
            n += parseFloat(v, 10);
        });

        switch (compare) {

        case "equals":
            return n === val;

        case "lt":
        case "min":
            return n < val;

        case "lte":
            return n <= val;

        case "gt":
        case "max":
            return n > val;

        case "gte":
            return n >= val;

        case "inclusive":
            return n >= val && n <= val2;

        case "exclusive":
            return n > val && n < val2;
        }

        // If we get here, the user didn't add anything to validate against
        return true;
    }

    //------------------------------
    //
    // Event bindings
    //
    //------------------------------

    $(function () {
        formFlags("body");
    });

    //------------------------------
    //
    // Exposure
    //
    //------------------------------

    //------------------------------
    // External
    //------------------------------

    $.validator.setDefaults({

    //------------------------------
    // Validation
    //------------------------------

        highlight: function(element, errorClass, validClass) {
            $(element).closest(".control-group")
                .removeClass(validClass).addClass(errorClass);
        },
        unhighlight: function (element, errorClass, validClass) {
            $(element).closest(".control-group")
                .removeClass(errorClass).addClass(validClass);
        },

        errorClass: "validation-error",
        errorElement: "span",
        invalidHandler: function (event, validator) {
            var f = getForm($(validator.currentForm).data("jQueryForm"));
            if ($.isFunction(f.onInvalid)) {
                f.onInvalid(validator);
            }
        },
        submitHandler: function (event, validator) {
            var f = getForm($(validator.currentForm).data("jQueryForm"));
            if ($.isFunction(f.onValid)) {
                f.onValid(validator);
            }
        },
        errorPlacement: function (error, element) {
            //var p = element.parents(".input-group"),
            var p = element.parents(".control-group"),
                doIndep = true,
                c = "single";

            if (!p.length) {
                if (element.next().length) {
                    error.insertAfter(element.siblings().last());
                    c = "group";
                } else {
                    error.insertAfter(element);
                }
            } else {
                if (element.is(".ignore-independent-errors")) {
                    error.addClass("dependent-error");
                    doIndep = false;
                }

                if (doIndep && element.parents(".independent-errors").length) {
                    element.parent().prepend(error);
                } else {
                    error.appendTo(p.find(".control-label"));
                }

                c = "group";
            }

            if ($.form.settings.validations.errors[c]) {
                error.addClass($.form.settings.validations.errors[c]);
            }
        }
    });

    // Magic 'validator' rule
    $.validator.addMethod("cloneRunner", cloneRunner);

    $.validator.addMethod("requireOne", requireOne,
        "This field is required.");
    $.validator.addMethod("cloneUnique", cloneUnique,
        "Values must be unique.");
    $.validator.addMethod("cloneNumeric", cloneNumeric,
        "Values do not equal sum.");

    //------------------------------
    // Internal
    //------------------------------

    $.extend($.fn, {

    //------------------------------
    // Utilities
    //------------------------------

        serializeObject: function () {
            return serializeObject($(this).eq(0));
        },

    //------------------------------
    // Form
    //------------------------------

        form: function () {
            var args = $.makeArray(arguments);
            if (typeof args[0] !== "string") {
                args.unshift(this.selector.replace(RX_SANITIZE, ""));
            }

            return form.apply(window, args.concat([this, true]));
        },
        formMode: function (mode, data, keepMessages) {
            return this.each(function () {
                formMode($(this).data("jQueryForm"), mode, data, keepMessages);
            });
        },
        formSuccess: function (data) {
            return this.each(function () {
                formSuccess($(this), data);
            });
        },
        formError: function (code, payload) {
            return this.each(function () {
                formError($(this), code, payload);
            });
        },
        formMessage: function (type, mode, data, code) {
            return this.each(function () {
                formMessage($(this), type, mode, data, code);
            });
        },
        clearFormMessage: function () {
            return this.each(function () {
                $(this).find(".form-messages").empty();
            });
        },
        formFlags: function () {
            return this.each(function () {
                formFlags($(this));
            });
        },

    //------------------------------
    // Inputs
    //------------------------------

        optionValues: function (structured) {
            var ret;
            this.filter("select").each(function () {
                ret = optionValues($(this), structured);
                return false;
            });
            return ret;
        },
        addOption: function (value, name, group) {
            return this.each(function () {
                addOption($(this), value, name, group);
            });
        },
        removeOption: function (v, group) {
            return this.each(function () {
                removeOption($(this), v, group);
            });
        },
        purgeAddedOptions: function () {
            return this.each(function () {
                purgeAddedOptions($(this));
            });
        }

    });

    //------------------------------
    // Form
    //------------------------------

    $.extend($, {
        forms: forms,
        form: form,
        arrayToObject: arrayToObject,
        expandArray: expandArray
    });
    $.extend($.form, {
        settings: DEFAULT_SETTINGS,
        define: defineForm,
        mode: formMode,
        build: buildForm,
        bind: bindForm,
        callback: formCallback,
        handler: formCallback,
        serialize: serializeObject,
        success: formSuccess,
        error: formError,
        message: createMessage,
        formFlags: formFlags
    });

}(window.jQuery));

