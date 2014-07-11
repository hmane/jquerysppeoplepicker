(function ($) {
    // Default settings
    var DEFAULT_SETTINGS = {
        // Search settings
        searchDelay: 300,
        minChars: 1,

        principalType: 1,

        // Display settings
        hintText: "Type in a user/group name",
        noResultsText: "No results",
        searchingText: "Searching...",
        deleteText: "&times;",
        animateDropdown: true,
        mySiteHostUrl: "",

        // Tokenization settings
        tokenLimit: 10,
        tokenDelimiter: ";",
        
        // Prepopulation settings
        prePopulate: null,
        processPrePopulate: false,
        

        // Manipulation settings
        idPrefix: "token-input-",

        // Callbacks
        onAdd: null,
        onDelete: null,
        onReady: null
    };

    // Default classes to use when theming
    var DEFAULT_CLASSES = {
        tokenList: "token-input-list",
        token: "token-input-token",
        tokenDelete: "token-input-delete-token",
        selectedToken: "token-input-selected-token",
        highlightedToken: "token-input-highlighted-token",
        dropdown: "token-input-dropdown",
        dropdownItem: "token-input-dropdown-item",
        dropdownItem2: "token-input-dropdown-item2",
        selectedDropdownItem: "token-input-selected-dropdown-item",
        inputToken: "token-input-input-token"
    };

    // Input box position "enum"
    var POSITION = {
        BEFORE: 0,
        AFTER: 1,
        END: 2
    };

    // Keys "enum"
    var KEY = {
        BACKSPACE: 8,
        TAB: 9,
        ENTER: 13,
        ESCAPE: 27,
        SPACE: 32,
        PAGE_UP: 33,
        PAGE_DOWN: 34,
        END: 35,
        HOME: 36,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        NUMPAD_ENTER: 108
    };

    // Additional public (exposed) methods
    var methods = {
        init: function (options) {
            RegisterSod("autofill.js", "/_layouts/15/autofill.js");
            var settings = $.extend({}, DEFAULT_SETTINGS, options || {});
            var maxperquery = [];
            EnsureIMNControl();
            return this.each(function () {
                $(this).data("tokenInputObject", new $.TokenList(this, settings, maxperquery));
            });
        },
        clear: function () {
            this.data("tokenInputObject").clear();
            return this;
        },
        add: function (item) {
            this.data("tokenInputObject").add(item);
            return this;
        },
        remove: function (item) {
            this.data("tokenInputObject").remove(item);
            return this;
        },
        get: function () {
            return this.data("tokenInputObject").getTokens();
        }
    }

    // Expose the .tokenInput function to jQuery as a plugin
    $.fn.peoplePicker = function (method) {
        // Method calling and initialization logic
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else {
            return methods.init.apply(this, arguments);
        }
    };

    // TokenList class for each input
    $.TokenList = function (input, settings, maxperquery) {
        // Build class names
        settings.classes = DEFAULT_CLASSES;
        // Save the tokens
        var saved_tokens = [];

        // Keep track of the number of tokens in the list
        var token_count = 0;

        // Basic cache to save on db hits
        var cache = new $.TokenList.Cache();

        // Keep track of the timeout, old vals
        var timeout;
        var input_val;
        

        // Create a new text input an attach keyup events
        var input_box = $("<input type=\"text\"  autocomplete=\"off\">")
            .css({
                outline: "none"
            })
            .attr("id", settings.idPrefix + input.id)
            .focus(function () {
                if (settings.tokenLimit === null || settings.tokenLimit !== token_count) {
                    show_dropdown_hint();
                }
            })
            .blur(function () {
                hide_dropdown();
                $(this).val("");
            })
            .bind("keyup keydown blur update", resize_input)
            .keydown(function (event) {
                $('.picSpinner').remove();
                var previous_token;
                var next_token;

                switch (event.keyCode) {
                case KEY.LEFT:
                case KEY.RIGHT:
                case KEY.UP:
                case KEY.DOWN:
                    if (!$(this).val()) {
                        previous_token = input_token.prev();
                        next_token = input_token.next();

                        if ((previous_token.length && previous_token.get(0) === selected_token) || (next_token.length && next_token.get(0) === selected_token)) {
                            // Check if there is a previous/next token and it is selected
                            if (event.keyCode === KEY.LEFT || event.keyCode === KEY.UP) {
                                deselect_token($(selected_token), POSITION.BEFORE);
                            } else {
                                deselect_token($(selected_token), POSITION.AFTER);
                            }
                        } else if ((event.keyCode === KEY.LEFT || event.keyCode === KEY.UP) && previous_token.length) {
                            // We are moving left, select the previous token if it exists
                            select_token($(previous_token.get(0)));
                        } else if ((event.keyCode === KEY.RIGHT || event.keyCode === KEY.DOWN) && next_token.length) {
                            // We are moving right, select the next token if it exists
                            select_token($(next_token.get(0)));
                        }
                    } else {
                        var dropdown_item = null;

                        if (event.keyCode === KEY.DOWN || event.keyCode === KEY.RIGHT) {
                            dropdown_item = $(selected_dropdown_item).next();
                        } else {
                            dropdown_item = $(selected_dropdown_item).prev();
                        }

                        if (dropdown_item.length) {
                            select_dropdown_item(dropdown_item);
                        }
                        return false;
                    }
                    break;

                case KEY.BACKSPACE:
                    previous_token = input_token.prev();

                    if (!$(this).val().length) {
                        if (selected_token) {
                            delete_token($(selected_token));
                            hidden_input.change();
                        } else if (previous_token.length) {
                            select_token($(previous_token.get(0)));
                        }

                        return false;
                    } else if ($(this).val().length === 1) {
                        hide_dropdown();
                    } else {
                        // set a timeout just long enough to let this function finish.
                        setTimeout(function () {
                            do_search();
                        }, 5);
                    }
                    break;

                case KEY.TAB:
                case KEY.ENTER:
                case KEY.NUMPAD_ENTER:
                case KEY.COMMA:
                    if (selected_dropdown_item) {
                        add_token($(selected_dropdown_item).data("tokeninput"));
                        hidden_input.change();
                        return false;
                    }
                    break;

                case KEY.ESCAPE:
                    hide_dropdown();
                    return true;

                default:
                    if (String.fromCharCode(event.which)) {
                        // set a timeout just long enough to let this function finish.
                        setTimeout(function () {
                            do_search();
                        }, 5);
                    }
                    break;
                }
            });

        // Keep a reference to the original input box
        var hidden_input = $(input)
            .hide()
            .val("")
            .focus(function () {
                input_box.focus();
            })
            .blur(function () {
                input_box.blur();
            });

        // Keep a reference to the selected token and dropdown item
        var selected_token = null;
        var selected_token_index = 0;
        var selected_dropdown_item = null;

        // The list to store the token items in
        var token_list = $("<ul />")
            .addClass(settings.classes.tokenList)
            .click(function (event) {
                var li = $(event.target).closest("li");
                if (li && li.get(0) && $.data(li.get(0), "tokeninput")) {
                    toggle_select_token(li);
                } else {
                    // Deselect selected token
                    if (selected_token) {
                        deselect_token($(selected_token), POSITION.END);
                    }

                    // Focus input box
                    input_box.focus();
                }
            })
            .mouseover(function (event) {
                var li = $(event.target).closest("li");
                if (li && selected_token !== this) {
                    li.addClass(settings.classes.highlightedToken);
                }
            })
            .mouseout(function (event) {
                var li = $(event.target).closest("li");
                if (li && selected_token !== this) {
                    li.removeClass(settings.classes.highlightedToken);
                }
            })
            .insertBefore(hidden_input);

        // The token holding the input box
        var input_token = $("<li />")
            .addClass(settings.classes.inputToken)
            .appendTo(token_list)
            .append(input_box);

        // The list to store the dropdown items in
        var dropdown = $("<div>")
            .addClass(settings.classes.dropdown)
            .appendTo("body")
            .hide();

        // Magic element to help us resize the text input
        var input_resizer = $("<tester/>")
            .insertAfter(input_box)
            .css({
                position: "absolute",
                top: -9999,
                left: -9999,
                width: "auto",
                fontSize: input_box.css("fontSize"),
                fontFamily: input_box.css("fontFamily"),
                fontWeight: input_box.css("fontWeight"),
                letterSpacing: input_box.css("letterSpacing"),
                whiteSpace: "nowrap"
            });

        // Pre-populate list if items exist
        hidden_input.val("");
        var li_data = settings.prePopulate || hidden_input.data("pre");
        if (li_data && li_data.length) {
            $.each(li_data, function (index, value) {
                insert_token(value);
                checkTokenLimit();
            });
        }

        // Initialization is done
        if ($.isFunction(settings.onReady)) {
            settings.onReady.call();
        }

        //
        // Public functions
        //

        this.clear = function () {
            token_list.children("li").each(function () {
                if ($(this).children("input").length === 0) {
                    delete_token($(this));
                }
            });
        }

        this.add = function (item) {
            add_token(item);
        }

        this.remove = function (item) {
            token_list.children("li").each(function () {
                if ($(this).children("input").length === 0) {
                    var currToken = $(this).data("tokeninput");
                    var match = true;
                    for (var prop in item) {
                        if (item[prop] !== currToken[prop]) {
                            match = false;
                            break;
                        }
                    }
                    if (match) {
                        delete_token($(this));
                    }
                }
            });
        }

        this.getTokens = function () {
            return saved_tokens;
        }

        //
        // Private functions
        //

        function checkTokenLimit() {
            if (settings.tokenLimit !== null && token_count >= settings.tokenLimit) {
                input_box.hide();
                hide_dropdown();
                return;
            }
        }

        function resize_input() {
            if (input_val === (input_val = input_box.val())) {
                return;
            }

            // Enter new content into resizer and resize input accordingly
            var escaped = input_val.replace(/&/g, '&amp;').replace(/\s/g, ' ').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            input_resizer.html(escaped);
            input_box.width(input_resizer.width() + 30);
        }

        function is_printable_character(keycode) {
            return ((keycode >= 48 && keycode <= 90) || // 0-1a-z
                (keycode >= 96 && keycode <= 111) || // numpad 0-9 + - / * .
                (keycode >= 186 && keycode <= 192) || // ; = , - . / ^
                (keycode >= 219 && keycode <= 222)); // ( \ ) '
        }
        
        function tokenFormatter(item) {
            return "<li><span class='ms-imnSpan'><a onmouseover='IMNShowOOUI();' onmouseout='IMNHideOOUI()'  href='#' class='ms-imnlink ms-spimn-presenceLink' ><span class='ms-spimn-presenceWrapper ms-imnImg ms-spimn-imgSize-10x10'><img name='imnmark' title='' ShowOfflinePawn='1' class='ms-spimn-img ms-spimn-presence-offline-10x10x32' src='/_layouts/15/images/spimn.png?rev=23' alt='User Presence' sip='" + item["sip"] + "' id='imn_" + item["email"] + ",type=sip' /></span>" + item["value"] + "</a></span></li>"
        }
        function resultsFormatter(item) {
            return "<li><div><div><div class='ms-tableCell'><span class='ms-imnSpan'><a href='#' class='ms-imnlink ms-spimn-presenceLink'><span class='ms-spimn-presenceWrapper ms-spimn-imgSize-5x36'><img name='imnmark' title='' showofflinepawn='1' class='ms-spimn-img ms-spimn-presence-offline-5x36x32' src='/_layouts/15/images/spimn.png' sip='" + item["sip"] + "' id='imn_" + item["email"] + ",type=sip'></span></a></span></div><div class='ms-tableCell ms-verticalAlignTop'><div class='ms-peopleux-userImgDiv'><span class='ms-imnSpan'><a href='#' onclick='IMNImageOnClick(event);return false;' class='ms-imnlink' tabindex='-1'><img title='' showofflinepawn='1' class=' ms-hide' src='/_layouts/15/images/spimn.png' alt='Offline' sip='" + item["email"] + "' id='imn_'" + item["email"] + "',type=sip' /></a><span class='ms-peopleux-imgUserLink'><span class='ms-peopleux-userImgWrapper' style='width:36px;height:36px;'><img class='userIMG' style='width: 36px; height: 36px; clip: rect(0px, 36px, 36px, 0px);' src='"+settings.mySiteHostUrl+"/_layouts/15/userphoto.aspx?accountname=" + item["networkaddress"] + "&amp;size=S\' alt='" + item["value"] + "' /></span></span></span></div></div><div class='ms-tableCell ms-verticalAlignTop' style='padding-left:10px;'><span class='resultName'>" + item["value"] + "</span><br /><span class='resultTitle'>" + item["title"] + "</span></div></div></div></li>"
        }

        // Inner function to a token to the list
        function insert_token(item) {
            var this_token = tokenFormatter(item);
            this_token = $(this_token)
                .addClass(settings.classes.token)
                .insertBefore(input_token);

            // The 'delete token' button
            $("<span>" + settings.deleteText + "</span>")
                .addClass(settings.classes.tokenDelete)
                .appendTo(this_token)
                .click(function () {
                    delete_token($(this).parent());
                    hidden_input.change();
                    return false;
                });

            // Store data on the token
            var token_data = {
                "id": item.id,
                "email": item.email,
                "title": item.title,
                "networkaddress": item.networkaddress,
                "sip": item.sip
            };
            token_data["value"] = item["value"];
            $.data(this_token.get(0), "tokeninput", item);

            // Save this token for duplicate checking
            saved_tokens = saved_tokens.slice(0, selected_token_index).concat([token_data]).concat(saved_tokens.slice(selected_token_index));
            selected_token_index++;

            // Update the hidden input
            update_hidden_input(saved_tokens, hidden_input);

            token_count += 1;

            // Check the token limit
            if (settings.tokenLimit !== null && token_count >= settings.tokenLimit) {
                input_box.hide();
                hide_dropdown();
            }

            return this_token;
        }

        // Add a token to the token list based on user input
        function add_token(item) {
            var callback = settings.onAdd;

            // Insert the new tokens
            if (settings.tokenLimit == null || token_count < settings.tokenLimit) {
                insert_token(item);
                checkTokenLimit();
            }

            // Clear input box
            input_box.val("");

            // Don't show the help dropdown, they've got the idea
            hide_dropdown();

            // Execute the onAdd callback if defined
            if ($.isFunction(callback)) {
                callback.call(hidden_input, item);
            }
            ProcessImn();
        }

        // Select a token in the token list
        function select_token(token) {
            token.addClass(settings.classes.selectedToken);
            selected_token = token.get(0);

            // Hide input box
            input_box.val("");

            // Hide dropdown if it is visible (eg if we clicked to select token)
            hide_dropdown();
        }

        // Deselect a token in the token list
        function deselect_token(token, position) {
            token.removeClass(settings.classes.selectedToken);
            selected_token = null;

            if (position === POSITION.BEFORE) {
                input_token.insertBefore(token);
                selected_token_index--;
            } else if (position === POSITION.AFTER) {
                input_token.insertAfter(token);
                selected_token_index++;
            } else {
                input_token.appendTo(token_list);
                selected_token_index = token_count;
            }

            // Show the input box and give it focus again
            input_box.focus();
        }

        // Toggle selection of a token in the token list
        function toggle_select_token(token) {
            var previous_selected_token = selected_token;

            if (selected_token) {
                deselect_token($(selected_token), POSITION.END);
            }

            if (previous_selected_token === token.get(0)) {
                deselect_token(token, POSITION.END);
            } else {
                select_token(token);
            }
        }

        // Delete a token from the token list
        function delete_token(token) {
            // Remove the id from the saved list
            var token_data = $.data(token.get(0), "tokeninput");
            var callback = settings.onDelete;

            var index = token.prevAll().length;
            if (index > selected_token_index) index--;

            // Delete the token
            token.remove();
            selected_token = null;

            // Show the input box and give it focus again
            input_box.focus();

            // Remove this token from the saved list
            saved_tokens = saved_tokens.slice(0, index).concat(saved_tokens.slice(index + 1));
            if (index < selected_token_index) selected_token_index--;

            // Update the hidden input
            update_hidden_input(saved_tokens, hidden_input);

            token_count -= 1;

            if (settings.tokenLimit !== null) {
                input_box
                    .show()
                    .val("")
                    .focus();
            }

            // Execute the onDelete callback if defined
            if ($.isFunction(callback)) {
                callback.call(hidden_input, token_data);
            }
        }

        // Update the hidden input box value
        function update_hidden_input(saved_tokens, hidden_input) {
            var token_values = $.map(saved_tokens, function (el) {
                return el["id"];
            });
            hidden_input.val(token_values.join(settings.tokenDelimiter));

        }

        // Hide and clear the results dropdown
        function hide_dropdown() {
            dropdown.hide().empty();
            selected_dropdown_item = null;
        }

        function show_dropdown() {
            dropdown
                .css({
                    position: "absolute",
                    top: $(token_list).offset().top + $(token_list).outerHeight(),
                    left: $(token_list).offset().left,
                    zindex: 999
                })
                .show();
        }

        function show_dropdown_searching() {
            if (settings.searchingText) {
                dropdown.html("<p>" + settings.searchingText + "</p>");
                show_dropdown();
            }
        }

        function show_dropdown_hint() {
            if (settings.hintText) {
                dropdown.html("<p>" + settings.hintText + "</p>");
                show_dropdown();
            }
        }

        // Highlight the query part of the search term
        function highlight_term(value, term) {
            return value.replace(new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + term + ")(?![^<>]*>)(?![^&;]+;)", "gi"), "<b>$1</b>");
        }

        function find_value_and_highlight_term(template, value, term) {
            return template.replace(new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + value + ")(?![^<>]*>)(?![^&;]+;)", "g"), highlight_term(value, term));
        }

        function removeDuplicates(results) {
        	var originalLength = results.length;
                if (saved_tokens.length != 0) {
                    //return $.grep(results,function(o,i) { return o.id === saved_tokens.id; },true);
                    for (i = 0; i < saved_tokens.length; i++) {
                        var existing = saved_tokens[i].id;
                        results = $.grep(results, function (o, i) {
                            return o.id === existing;
                        }, true);
                    }
                }
                if(originalLength != results.length)
                {
	                maxperquery[input_box.val().toLowerCase()] = originalLength + (originalLength - results.length);

                }
                return results;
            }
            // Populate the results dropdown with some results

        function populate_dropdown(query, results) {

            if (results && results.length) {
                results = removeDuplicates(results);
                dropdown.empty();
                var dropdown_ul = $("<ul>")
                    .appendTo(dropdown)
                    .mouseover(function (event) {
                        select_dropdown_item($(event.target).closest("li"));
                    })
                    .mousedown(function (event) {
                        add_token($(event.target).closest("li").data("tokeninput"));
                        hidden_input.change();
                        return false;
                    })
                    .hide();

                $.each(results, function (index, value) {
                    var this_li = resultsFormatter(value);

                    this_li = find_value_and_highlight_term(this_li, value["value"], query);
                    this_li = $(this_li).appendTo(dropdown_ul);

                    if (index % 2) {
                        this_li.addClass(settings.classes.dropdownItem);
                    } else {
                        this_li.addClass(settings.classes.dropdownItem2);
                    }

                    if (index === 0) {
                        select_dropdown_item(this_li);
                    }

                    $.data(this_li.get(0), "tokeninput", value);
                });
				
                show_dropdown();

                if (settings.animateDropdown) {
                    dropdown_ul.slideDown("fast");
                } else {
                    dropdown_ul.show();
                }
                ProcessImn();
                $(".userIMG").imgPreload({
                    spinner_src: '/SiteAssets/spinner.gif'
                });
            } else {
                if (settings.noResultsText) {
                    dropdown.html("<p>" + settings.noResultsText + "</p>");
                    show_dropdown();
                }
            }
        }

        // Highlight an item in the results dropdown
        function select_dropdown_item(item) {
            if (item) {
                if (selected_dropdown_item) {
                    deselect_dropdown_item($(selected_dropdown_item));
                }

                item.addClass(settings.classes.selectedDropdownItem);
                selected_dropdown_item = item.get(0);
            }
        }

        // Remove highlighting from an item in the results dropdown
        function deselect_dropdown_item(item) {
            item.removeClass(settings.classes.selectedDropdownItem);
            selected_dropdown_item = null;
        }

        // Do a search and show the "searching" dropdown if the input is longer
        // than settings.minChars
        function do_search() {
            var query = input_box.val().toLowerCase();

            if (query && query.length) {
                if (selected_token) {
                    deselect_token($(selected_token), POSITION.AFTER);
                }

                if (query.length >= settings.minChars) {
                    show_dropdown_searching();
                    clearTimeout(timeout);

                    timeout = setTimeout(function () {
                        run_search(query);
                    }, settings.searchDelay);
                } else {
                    hide_dropdown();
                }
            }
        }

        // Do the actual search
        function run_search(query) {
            var cache_key = query;
            var cached_results = cache.get(cache_key);

            if (cached_results && cached_results.length == maxperquery[query]) {
                populate_dropdown(query, cached_results);
            } else {
            var maxResult = settings.tokenLimit
            	if(maxperquery[query] && maxperquery[query] > maxResult)
            	{
            		maxResult = maxperquery[query];
            	}

                EnsureScript('SP.js', typeof SP.ClientContext, function () {
                    EnsureScript('autofill.js', typeof SPClientAutoFill, function () {
                        var searchQuery = new SP.UI.ApplicationPages.ClientPeoplePickerQueryParameters();
                        searchQuery.set_allowMultipleEntities(true);
                        searchQuery.set_maximumEntitySuggestions(maxResult);
                        searchQuery.set_allowEmailAddresses(true);
                        searchQuery.set_principalType(settings.principalType);
                        searchQuery.set_principalSource(15);
                        searchQuery.set_queryString(query);

                        var clientContext = SP.ClientContext.get_current();
                        var searchResult = SP.UI.ApplicationPages.ClientPeoplePickerWebServiceInterface.clientPeoplePickerSearchUser(clientContext, searchQuery);

                        clientContext.executeQueryAsync(function () {
                            var users = [];
                            var results = clientContext.parseObjectFromJsonString(searchResult.get_value());
                            for (i = 0; i < results.length; i++) {
                                var filtered = $(users).filter(function () {
                                    return this.value == results[i].DisplayText;
                                });
                                if (filtered.length == 0) {
                                    var title = results[i].EntityData.Title;
                                    if (title == undefined) {
                                        title = "";
                                    }
                                    var sip = results[i].EntityData.SIPAddress;
                                    if(sip == undefined)
                                    {
                                    	sip = results[i].EntityData.Email;
                                    }
                                    users.push({
                                        value: results[i].DisplayText,
                                        id: results[i].Key,
                                        email: results[i].EntityData.Email,
                                        networkaddress: results[i].Description,
                                        title: title,
                                        sip: sip
                                    });
                                }
                            }
                            cache.add(cache_key, users, maxperquery);
                            populate_dropdown(query, users);
                        });
                    });
                });
            }
        }
    };


    // Really basic cache for the results
    $.TokenList.Cache = function (options) {
        var settings = $.extend({
            max_size: 500,
        }, options);

        var data = {};
        var size = 0;

        var flush = function (maxperquery) {
            data = {};
            size = 0;
            maxperquery = {};
        };

        this.add = function (query, results, maxperquery) {
            if (size > settings.max_size) {
                flush(maxperquery);
            }

            if (!data[query]) {
                size += 1;
                maxperquery[query] = results.length;
            }

            data[query] = results;
        };

        this.get = function (query) {
            return data[query];
        };
    };
}(jQuery));