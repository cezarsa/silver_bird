/***************************************************************************

	sexy-combo 2.1.3	: A jQuery date time picker.

	Authors:
		Kadalashvili.Vladimir@gmail.com - Vladimir Kadalashvili
		thetoolman@gmail.com

	Version: 2.1.3

	Website: http://code.google.com/p/sexy-combo/


 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 *   This program is distributed in the hope that it will be useful,       *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
 *   GNU General Public License for more details.                          *
 *                                                                         *
 *   You should have received a copy of the GNU General Public License     *
 *   along with this program; if not, write to the                         *
 *   Free Software Foundation, Inc.,                                       *
 *   59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.             *
 *                                                                         *
 ***************************************************************************/


;(function($) {
    $.fn.sexyCombo = function(config) {
        return this.each(function() {
		if ("SELECT" != this.tagName.toUpperCase()) {
		    return;
		}
	    new $sc(this, config);
	    });
    };

    //default config options
    var defaults = {
        //skin name
        skin: "sexy",

	    //this suffix will be appended to the selectbox's name and will be text input's name
	    suffix: "__sexyCombo",

	    //the same as the previous, but for hidden input
	    hiddenSuffix: "__sexyComboHidden",

	    //rename original select, and call the hidden field the original name attribute?
	    renameOriginal: false,

	   //initial / default hidden field value.
	   //Also applied when user types something that is not in the options list
	    initialHiddenValue: "",

	    //if provided, will be the value of the text input when it has no value and focus
	    emptyText: "",

	    //if true, autofilling will be enabled
	    autoFill: false,

	    //if true, selected option of the selectbox will be the initial value of the combo
	    triggerSelected: true,

	    //function for options filtering
	    filterFn: null,

	    //if true, the options list will be placed above text input
	    dropUp: false,

	    //separator for values of multiple combos
	    separator: ",",

		//key json name for key/value pair
		key: "value",

		//value json for key/value pair
		value: "text",

	    //all callback functions are called in the scope of the current sexyCombo instance

	    //called after dropdown list appears
	    showListCallback: null,

	    //called after dropdown list disappears
	    hideListCallback: null,

	    //called at the end of constructor
	    initCallback: null,

	    //called at the end of initEvents function
	    initEventsCallback: null,

	    //called when both text and hidden inputs values are changed
	    changeCallback: null,

	    //called when text input's value is changed
	    textChangeCallback: null,

		checkWidth: true
    };

    //constructor
    //creates initial markup and does some initialization
    $.sexyCombo = function(selectbox, config) {

        if (selectbox.tagName.toUpperCase() != "SELECT")
	        return;

	    this.config = $.extend({}, defaults, config || {});



	    this.selectbox = $(selectbox);
	    this.options = this.selectbox.children().filter("option");

	    this.wrapper = this.selectbox.wrap("<div>").
	    hide().
	    parent().
	    addClass("combo").
	    addClass(this.config.skin);

	    this.input = $("<input type='text' />").
	    appendTo(this.wrapper).
	    attr("autocomplete", "off").
      attr("readonly", "readonly").
	    attr("value", "").
	    attr("name", this.selectbox.attr("name") + this.config.suffix);

	    var origName = this.selectbox.attr("name");
	    var newName = origName + this.config.hiddenSuffix;
	    if(this.config.renameOriginal) {
	    	this.selectbox.attr("name", newName);
	    }

	    this.hidden = $("<input type='hidden' />").
	    appendTo(this.wrapper).
	    attr("autocomplete", "off").
	    attr("value", this.config.initialHiddenValue).
	    attr("name", this.config.renameOriginal ? origName : newName);

        this.icon = $("<div />").
	    appendTo(this.wrapper).
	    addClass("icon");

	    this.listWrapper = $("<div />").
	    appendTo(this.wrapper).
	    //addClass("invisible").
	    addClass("list-wrapper");

	    this.updateDrop();

	    this.list = $("<ul />").appendTo(this.listWrapper);
	    var self = this;
		var optWidths = [];
	    this.options.each(function() {
	        var optionText = $.trim($(this).text());
			if (self.config.checkWidth) {
			    optWidths.push($("<li />").
	            appendTo(self.list).
	            html("<span>" + optionText + "</span>").
	            addClass("visible").find("span").outerWidth());
			}
			else {
	            $("<li />").
	            appendTo(self.list).
	            html("<span>" + optionText + "</span>").
	            addClass("visible");
			}
	    });


	    this.listItems = this.list.children();




		/*this.listItems.find("span").each(function() {
		    optWidths.push($(this).outerWidth());
		});*/
		if (optWidths.length) {
		    optWidths = optWidths.sort(function(a, b) {
		        return a - b;
		    });
		    var maxOptionWidth = optWidths[optWidths.length - 1];


		}


        this.singleItemHeight = this.listItems.outerHeight();
		//bgiframe causes some problems, let's remove it
		/*if ("function" == typeof this.listWrapper.bgiframe) {
		    this.listWrapper.bgiframe({height: this.singleItemHeight * this.wrapper.find("li").height()});
		}*/
		this.listWrapper.addClass("invisible");


	    if ($.browser.opera) {
	        this.wrapper.css({position: "relative", left: "0", top: "0"});
	    }



	    this.filterFn = ("function" == typeof(this.config.filterFn)) ? this.config.filterFn : this.filterFn;

	    this.lastKey = null;
	    //this.overflowCSS = "overflow";

	    this.multiple = this.selectbox.attr("multiple");

	    var self = this;

	    this.wrapper.data("sc:lastEvent", "click");

	    this.overflowCSS = "overflowY";

	    if ((this.config.checkWidth) && (this.listWrapper.innerWidth() < maxOptionWidth)) {
		    this.overflowCSS = "overflow";

		}


	    this.notify("init");
	    this.initEvents();
    };

    //shortcuts
    var $sc = $.sexyCombo;
    $sc.fn = $sc.prototype = {};
    $sc.fn.extend = $sc.extend = $.extend;

    $sc.fn.extend({
        //TOC of our plugin
	    //initializes all event listeners
        initEvents: function() {
	        var self = this;

	        this.icon.bind("click", function(e) {
	            if (!self.wrapper.data("sc:positionY"))	{
		            self.wrapper.data("sc:positionY", e.pageY);
		        }
	        });

	        /*this.input.bind("click", function(e) {
	            if (!self.wrapper.data("sc:positionY"))	{
		            self.wrapper.data("sc:positionY", e.pageY);
		        }
	        });*/


	        this.wrapper.bind("click", function(e) {
	            if (!self.wrapper.data("sc:positionY"))	{
		            self.wrapper.data("sc:positionY", e.pageY);
		        }
	        });

	        this.icon.bind("click", function() {
		        if (self.input.attr("disabled")) {
			         self.input.attr("disabled", false);
		        }
		        self.wrapper.data("sc:lastEvent", "click");
		        self.filter();
	            self.iconClick();
	        });

	        this.listItems.bind("mouseover", function(e) {
	            //self.highlight(e.target);
				if ("LI" == e.target.nodeName.toUpperCase()) {
				    self.highlight(e.target);
				}
				else {
				    self.highlight($(e.target).parent());
				}
	        });

	        this.listItems.bind("click", function(e) {
	            self.listItemClick($(e.target));
	        });

			/*this.input.bind("keyup", function(e) {
				self.wrapper.data("sc:lastEvent", "key");
				//$sc.log(self.wrapper.data("sc:lastEvent"));
				self.keyUp(e);
			});*/





	        /*this.input.bind("keypress", function(e) {
	            if ($sc.KEY.RETURN == e.keyCode) {
	                e.preventDefault();
			    }
		        if ($sc.KEY.TAB == e.keyCode)
			        e.preventDefault();
	        });*/

	        $(document).bind("click", function(e) {
	            if ((self.icon.get(0) == e.target) || (self.input.get(0) == e.target))
		            return;

		        self.hideList();
	        });

	        this.triggerSelected();
	        this.applyEmptyText();



		    /*this.input.bind("click", function(e) {
			    self.wrapper.data("sc:lastEvent", "click");
			    self.icon.trigger("click");
		    });*/


			//here
	        this.wrapper.bind("click", function() {
	            self.wrapper.data("sc:lastEvent", "click");
	        });

	        /*this.input.bind("keydown", function(e) {
	            if (9 == e.keyCode) {
		            e.preventDefault();
		        }
	        });*/

	        this.wrapper.bind("keyup", function(e) {
		        var k = e.keyCode;
		        for (key in $sc.KEY) {
		            if ($sc.KEY[key] == k) {
			            return;
			        }
		        }
	            self.wrapper.data("sc:lastEvent", "key");
				//$sc.log("Last evt is key");
	        });

	        /*this.input.bind("click", function() {
	            self.wrapper.data("sc:lastEvent", "click");
            });*/

	        this.icon.bind("click", function(e) {
	            if (!self.wrapper.data("sc:positionY"))	{
		            self.wrapper.data("sc:positionY", e.pageY);
		        }
	        });

	        /*this.input.bind("click", function(e) {
	            if (!self.wrapper.data("sc:positionY"))	{
		            self.wrapper.data("sc:positionY", e.pageY);
		        }
	        });*/


	        this.wrapper.bind("click", function(e) {
	            if (!self.wrapper.data("sc:positionY"))	{
		            self.wrapper.data("sc:positionY", e.pageY);
		        }
	        });

			this.notify("initEvents");
	    },


	    getTextValue: function() {
            return this.__getValue("input");
	    },

	    getCurrentTextValue: function() {
            return this.__getCurrentValue("input");
	    },

	    getHiddenValue: function() {
            return this.__getValue("hidden");
	    },

	    getCurrentHiddenValue: function() {
	        return this.__getCurrentValue("hidden");
	    },

	    __getValue: function(prop) {
	        prop = this[prop];
	        if (!this.multiple)
	            return $.trim(prop.val());

	        var tmpVals = prop.val().split(this.config.separator);
	        var vals = [];

	        for (var i = 0, len = tmpVals.length; i < len; ++i) {
	            vals.push($.trim(tmpVals[i]));
	        }

	        vals = $sc.normalizeArray(vals);

	        return vals;
	    },

	    __getCurrentValue: function(prop) {
	        prop = this[prop];
	        if (!this.multiple)
	            return $.trim(prop.val());

            return $.trim(prop.val().split(this.config.separator).pop());
	    },

	    //icon click event listener
	    iconClick: function() {
	        if (this.listVisible()) {
	            this.hideList();
			    this.input.blur();
		    }
	        else {
	            this.showList();
			    this.input.focus();
	            if (this.input.val().length) {
		            this.selection(this.input.get(0), 0, this.input.val().length);
		        }
		    }
	    },

	    //returns true when dropdown list is visible
	    listVisible: function() {
	        return this.listWrapper.hasClass("visible");
	    },

	    //shows dropdown list
	    showList: function() {
	        if (!this.listItems.filter(".visible").length)
	            return;

	        this.listWrapper.removeClass("invisible").
	        addClass("visible");
	        this.wrapper.css("zIndex", "99999");
	        this.listWrapper.css("zIndex", "99999");
	        this.setListHeight();

		    var listHeight = this.listWrapper.height();
		    var inputHeight = this.wrapper.height();

		    var bottomPos = parseInt(this.wrapper.data("sc:positionY")) + inputHeight + listHeight;
		    var maxShown = $(window).height() + $(document).scrollTop();
		    if (bottomPos > maxShown) {
		        this.setDropUp(true);
		    }
		    else {
		        this.setDropUp(false);
		    }

		    if ("" == $.trim(this.input.val())) {
	            this.highlightFirst();
	            this.listWrapper.scrollTop(0);
			}
			else {
			    this.highlightSelected();
			}
	        this.notify("showList");
	    },

	    //hides dropdown list
	    hideList: function() {
	        if (this.listWrapper.hasClass("invisible"))
	            return;
	        this.listWrapper.removeClass("visible").
	        addClass("invisible");
	        this.listWrapper.css("zIndex", "99999");

	        this.notify("hideList");
	    },

	    //returns sum of all visible items height
	    getListItemsHeight: function() {

			var itemHeight = this.singleItemHeight;
	        return itemHeight * this.liLen();
	    },

	    //changes list wrapper's overflow from hidden to scroll and vice versa (depending on list items height))
	    setOverflow: function() {
		    var maxHeight = this.getListMaxHeight();

	        if (this.getListItemsHeight() > maxHeight)
	            this.listWrapper.css(this.overflowCSS, "scroll");
	        else
	            this.listWrapper.css(this.overflowCSS, "hidden");
	    },

	    //highlights active item of the dropdown list
	    highlight: function(activeItem) {
	        if (($sc.KEY.DOWN == this.lastKey) || ($sc.KEY.UP == this.lastKey))
	            return;

	        this.listItems.removeClass("active");
	        $(activeItem).addClass("active");
	    },



	    //sets text and hidden inputs value
	    setComboValue: function(val, pop, hideList) {
	        var oldVal = this.input.val();

	        var v = "";
	        if (this.multiple) {
	            v = this.getTextValue();
		        if (pop)
		            v.pop();
		        v.push($.trim(val));
		        v = $sc.normalizeArray(v);
		        v = v.join(this.config.separator) + this.config.separator;

	        } else {
	            v = $.trim(val);
	        }
	        this.input.val(v);
	        this.setHiddenValue(val);
	        this.filter();
	        if (hideList)
	            this.hideList();
	        this.input.removeClass("empty");


	        if (this.multiple)
	            this.input.focus();

	        if (this.input.val() != oldVal)
	            this.notify("textChange");

	    },



	    //sets hidden inputs value
	    //takes text input's value as a param
	    setHiddenValue: function(val) {
	        var set = false;
	        val = $.trim(val);
	        var oldVal = this.hidden.val();

	        if (!this.multiple) {
	            for (var i = 0, len = this.options.length; i < len; ++i){
		            if (val == this.options.eq(i).text()) {
		                this.hidden.val(this.options.eq(i).val());
			            set = true;
			            break;
		            }
		        }
	         }
	        else {
	            var comboVals = this.getTextValue();
		        var hiddenVals = [];
		        for (var i = 0, len = comboVals.length; i < len; ++i) {
		            for (var j = 0, len1 = this.options.length; j < len1; ++j) {
		                if (comboVals[i] == this.options.eq(j).text()) {
			                hiddenVals.push(this.options.eq(j).val());
			            }
		            }
		        }

		        if (hiddenVals.length) {
		            set = true;
		        this.hidden.val(hiddenVals.join(this.config.separator));
		    }
	     }

	    if (!set) {
	        this.hidden.val(this.config.initialHiddenValue);
	    }

	    if (oldVal != this.hidden.val())
	        this.notify("change");

	    this.selectbox.val(this.hidden.val());
		this.selectbox.trigger("change");
	},


	    listItemClick: function(item) {
	        this.setComboValue(item.text(), true, true);
	        this.inputFocus();
	    },

	    //adds / removes items to / from the dropdown list depending on combo's current value
	    filter: function() {
		    if ("yes" == this.wrapper.data("sc:optionsChanged")) {
		        var self = this;
		        this.listItems.remove();
                this.options = this.selectbox.children().filter("option");
	            this.options.each(function() {
	                var optionText = $.trim($(this).text());
	                $("<li />").
	                appendTo(self.list).
	                text(optionText).
	                addClass("visible");

	            });

	            this.listItems = this.list.children();

	            this.listItems.bind("mouseover", function(e) {
	                self.highlight(e.target);
	            });

	            this.listItems.bind("click", function(e) {
	                self.listItemClick($(e.target));
	            });

			    self.wrapper.data("sc:optionsChanged", "");
		    }

	        var comboValue = this.input.val();
	        var self = this;

	        this.listItems.each(function() {
	            var $this = $(this);
	            var itemValue = $this.text();
		        if (self.filterFn.call(self, self.getCurrentTextValue(), itemValue, self.getTextValue())) {
		           $this.removeClass("invisible").
		           addClass("visible");
		        } else {
		            $this.removeClass("visible").
		            addClass("invisible");
		        }
	        });

	        this.setOverflow();
	        this.setListHeight();
	    },

	//default dropdown list filtering function
	filterFn: function(currentComboValue, itemValue, allComboValues) {
		if ("click" == this.wrapper.data("sc:lastEvent")) {
		    return true;
		}
		//alert(currentComboValue.toSource());
	    if (!this.multiple) {
	        return itemValue.toLowerCase().indexOf(currentComboValue.toLowerCase()) == 0;
	    }
	    else {
	        //exclude values that are already selected

		for (var i = 0, len = allComboValues.length; i < len; ++i) {
		    if (itemValue == allComboValues[i]) {
		        return false;
		    }
		}

		return itemValue.toLowerCase().search(currentComboValue.toLowerCase()) == 0;
	    }
	},

	//just returns integer value of list wrapper's max-height property
	getListMaxHeight: function() {

		var result = parseInt(this.listWrapper.css("maxHeight"), 10);
		if (isNaN(result)) {
		    result = this.singleItemHeight * 10;
		}

		return result;
	},

	//corrects list wrapper's height depending on list items height
	setListHeight: function() {

	    var liHeight = this.getListItemsHeight();

	    var maxHeight = this.getListMaxHeight();


	    var listHeight = this.listWrapper.height();
	    if (liHeight < listHeight) {
	        this.listWrapper.height(liHeight);

			return liHeight;
	    }
	    else if (liHeight > listHeight) {
	        this.listWrapper.height(Math.min(maxHeight, liHeight));

			return Math.min(maxHeight, liHeight);
	    }

	},

	//returns active (hovered) element of the dropdown list
	getActive: function() {
	    return this.listItems.filter(".active");
	},

	keyUp: function(e) {
	    this.lastKey = e.keyCode;
	    var k = $sc.KEY;
	    switch (e.keyCode) {
	        case k.RETURN:
			case k.TAB:
			//this.input.focus();
		    this.setComboValue(this.getActive().text(), true, true);
		    //if (!this.multiple)
		        //this.input.blur(); //

		break;
		case k.DOWN:
		    this.highlightNext();
		break;
		case k.UP:
		    this.highlightPrev();
		break;
		case k.ESC:
		    this.hideList();
		break;
		default:
		    this.inputChanged();
		break;
	    }


	},

	//returns number of currently visible list items
	liLen: function() {
	    return this.listItems.filter(".visible").length;
	},

	//triggered when the user changes combo value by typing
	inputChanged: function() {
	    this.filter();

	    if (this.liLen()) {
	        this.showList();
		this.setOverflow();
		this.setListHeight();
	    } else {
	        this.hideList();
	    }

	    this.setHiddenValue(this.input.val());
	    this.notify("textChange");

	},

	//highlights first item of the dropdown list
	highlightFirst: function() {
	    this.listItems.removeClass("active").filter(".visible:eq(0)").addClass("active");
	    this.autoFill();
	},

	highlightSelected: function() {
        this.listItems.removeClass("active");
		var val = $.trim(this.input.val());

		try {
			this.listItems.each(function() {
			    var $this = $(this);
				if ($this.text() == val) {
				    $this.addClass("active");
					self.listWrapper.scrollTop(0);
					self.scrollDown();

				}
			});
			//no match, must be partial input string; highlight first item
			this.highlightFirst();

		} catch (e) {}
	},

	//highlights item of the dropdown list next to the currently active item
	highlightNext: function() {
	    var $next = this.getActive().next();

	    while ($next.hasClass("invisible") && $next.length) {
	        $next = $next.next();
	    }

	    if ($next.length) {
	        this.listItems.removeClass("active");
		$next.addClass("active");
		this.scrollDown();
	    }
	},

	//scrolls list wrapper down when needed
	scrollDown: function() {
	    if ("scroll" != this.listWrapper.css(this.overflowCSS))
	        return;

            var beforeActive = this.getActiveIndex() + 1;
			/*if ($.browser.opera)
			    ++beforeActive;*/

	    var minScroll = this.listItems.outerHeight() * beforeActive - this.listWrapper.height();

		if ($.browser.msie)
            minScroll += beforeActive;

	    if (this.listWrapper.scrollTop() < minScroll)
	        this.listWrapper.scrollTop(minScroll);
	},


	//highlights list item before currently active item
	highlightPrev: function() {
	    var $prev = this.getActive().prev();

	    while ($prev.length && $prev.hasClass("invisible"))
	        $prev = $prev.prev();

            if ($prev.length) {
	        this.getActive().removeClass("active");
		$prev.addClass("active");
		this.scrollUp();
	    }
	},

	//returns index of currently active list item
	getActiveIndex: function() {
	    return $.inArray(this.getActive().get(0), this.listItems.filter(".visible").get());
	},


	//scrolls list wrapper up when needed
	scrollUp: function() {

	    if ("scroll" != this.listWrapper.css(this.overflowCSS))
	        return;

	    var maxScroll = this.getActiveIndex() * this.listItems.outerHeight();

	    if (this.listWrapper.scrollTop() > maxScroll) {
	        this.listWrapper.scrollTop(maxScroll);
	    }
	},

	//emptyText stuff
	applyEmptyText: function() {
	    if (!this.config.emptyText.length)
	        return;

	    var self = this;
	    this.input.bind("focus", function() {
                self.inputFocus();
	    }).
	    bind("blur", function() {
                self.inputBlur();
	    });

	    if ("" == this.input.val()) {
	        this.input.addClass("empty").val(this.config.emptyText);
	    }
	},

	inputFocus: function() {
	    if (this.input.hasClass("empty")) {
		this.input.removeClass("empty").
		val("");
        }
	},

	inputBlur: function() {
	    if ("" == this.input.val()) {
		this.input.addClass("empty").
		val(this.config.emptyText);
	    }

	},

	//triggerSelected stuff
	triggerSelected: function() {
	    if (!this.config.triggerSelected)
	        return;

	    var self = this;
		try {
	    this.options.each(function() {
	        if ($(this).attr("selected")) {
		        self.setComboValue($(this).text(), false, true);
				throw new Error();
		    }
	    });
		} catch (e) {
		    return;
		}

        self.setComboValue(this.options.eq(0).text(), false, false);
	},

	//autofill stuff
	autoFill: function() {
	    if (!this.config.autoFill || ($sc.KEY.BACKSPACE == this.lastKey) || this.multiple)
	        return;

	    var curVal = this.input.val();
	    var newVal = this.getActive().text();
	    this.input.val(newVal);
	    this.selection(this.input.get(0), curVal.length, newVal.length);


	},

	//provides selection for autofilling
	//borrowed from jCarousel
	selection: function(field, start, end) {
	    if( field.createTextRange ){
		var selRange = field.createTextRange();
		selRange.collapse(true);
		selRange.moveStart("character", start);
		selRange.moveEnd("character", end);
		selRange.select();
	    } else if( field.setSelectionRange ){
		field.setSelectionRange(start, end);
	    } else {
		if( field.selectionStart ){
			field.selectionStart = start;
			field.selectionEnd = end;
		}
	    }
	   // field.focus();
	},


	//for internal use
	updateDrop: function() {
	    if (this.config.dropUp)
	        this.listWrapper.addClass("list-wrapper-up");
	    else
	        this.listWrapper.removeClass("list-wrapper-up");
	},

	//updates dropUp config option
	setDropUp: function(drop) {
        this.config.dropUp = drop;
	    this.updateDrop();
	},

	notify: function(evt) {
	    if (!$.isFunction(this.config[evt + "Callback"]))
	        return;

	    this.config[evt + "Callback"].call(this);
	}
    });

    $sc.extend({
        //key codes
	//from jCarousel
        KEY: {
	    UP: 38,
	    DOWN: 40,
	    DEL: 46,
	    TAB: 9,
	    RETURN: 13,
	    ESC: 27,
	    COMMA: 188,
	    PAGEUP: 33,
	    PAGEDOWN: 34,
	    BACKSPACE: 8
	},

	//for debugging
	log: function(msg) {
	    var $log = $("#log");
	    $log.html($log.html() + msg + "<br />");
	},

    createSelectbox: function(config) {
	    var $selectbox = $("<select />").
	    appendTo(config.container).
	    attr({name: config.name, id: config.id, size: "1"});

	    if (config.multiple)
	        $selectbox.attr("multiple", true);

	    var data = config.data;
	    var selected = false;

	    for (var i = 0, len = data.length; i < len; ++i) {
	        selected = data[i].selected || false;
	        $("<option />").appendTo($selectbox).
			attr("value", data[i][config.key]).
			text(data[i][config.value]).
			attr("selected", selected);
	    }

	    return $selectbox.get(0);
	},

	create: function(config) {
            var defaults = {
	        //the name of the selectbox
	        name: "",
		//the ID of the selectbox
		id: "",
		//data for the options
		/*
		This is an array of objects. The objects should contain the following properties:
		(string)value - the value of the <option>
		(string) text - text of the <option>
		(bool) selected - if set to true, "selected" attribute of this <option> will be set to true
		*/
		data: [],

		//if true, combo with multiple choice will be created
		multiple: false,

		//key json name for key/value pair
		key: "value",

		//value json for key/value pair
		value: "text",

		//an element that will contain the widget
		container: $(document),
		//url that contains JSON object for options data
		//format is the same as in data config option
		//if passed, "data" config option will be ignored
		url: "",
		//params for AJAX request
		ajaxData: {}
	    };
	    config = $.extend({}, defaults, config || {});

            if (config.url) {
	        return $.getJSON(config.url, config.ajaxData, function(data) {
		    delete config.url;
		    delete config.ajaxData;
		    config.data = data;
		    return $sc.create(config);
		});
	    }

	    config.container = $(config.container);

            var selectbox = $sc.createSelectbox(config);
	    return new $sc(selectbox, config);

	},

	deactivate: function($select) {
	    $select = $($select);
		$select.each(function() {
		    if ("SELECT" != this.tagName.toUpperCase()) {
			    return;
			}
			var $this = $(this);
			if (!$this.parent().is(".combo")) {
			    return;
			}
			//$this.parent().find("input[type='text']").attr("disabled", true);

		});
	},

	activate: function($select) {
	    $select = $($select);
		$select.each(function() {
		    if ("SELECT" != this.tagName.toUpperCase()) {
			    return;
			}
			var $this = $(this);
			if (!$this.parent().is(".combo")) {
			    return;
			}
			$this.parent().find("input[type='text']").attr("disabled", false);
		});
	},

	changeOptions: function($select) {
		$select = $($select);
        $select.each(function() {
		    if ("SELECT" != this.tagName.toUpperCase()) {
			    return;
			}

			var $this = $(this);
			var $wrapper  = $this.parent();
			var $input = $wrapper.find("input[type='text']");
			var $listWrapper = $wrapper.find("ul").parent();

	        $listWrapper.removeClass("visible").
	        addClass("invisible");
	        $wrapper.css("zIndex", "0");
	        $listWrapper.css("zIndex", "99999");

			$input.val("");
			$wrapper.data("sc:optionsChanged", "yes");
			var $selectbox = $this;
		    $selectbox.parent().find("input[type='text']").val($selectbox.find("option:eq(0)").text());
		    $selectbox.parent().data("sc:lastEvent", "click");
		    $selectbox.find("option:eq(0)").attr('selected','selected');
		});
	},

	normalizeArray: function(arr) {
	    var result = [];
	    for (var i = 0, len =arr.length; i < len; ++i) {
	        if ("" == arr[i])
		    continue;

		result.push(arr[i]);
	    }

	    return result;
	}
    });
})(jQuery);
