(function($) {
  $.fn.simpleSelect = function(options) {
    return this.each(function() {
      new $.simpleSelect(this, options);
    });
  };

  $.simpleSelect = function(selectEl, simpleSelectOptions) {
    // One of my goals is to render this as fast as possible,  so I'm going
    // to avoid using jQuery in this contructor and work directly with the DOM.
    if(selectEl.tagName.toUpperCase() != "SELECT")
      return;

    this.changeCallback = simpleSelectOptions.change;
    this.selectEl = selectEl;
    if(selectEl.simpleSelectEl) {
      $(selectEl.simpleSelectEl.replacementDiv).remove();
    }
    selectEl.simpleSelectEl = this;
    selectEl.className = 'ss_overriden';

    this.replacementDiv = document.createElement('div');
    this.replacementDiv.className = 'simple_select';
    this.replacementDiv.simpleSelect = this;

    this.selectedLabel = document.createElement('span');
    this.selectedLabel.className = 'label';

    this.selectedLabelTxt = document.createElement('span');
    this.selectedLabelImg = document.createElement('img');
    this.selectedLabelImg.src = 'img/arrow_down.gif';

    this.optionsArea = document.createElement('div');
    this.optionsArea.className = 'options_area';

    this.optionsList = document.createElement('ul');

    var options = selectEl.options;
    var selectedIndex = this.selectEl.selectedIndex;
    for(var i = 0, len = options.length; i < len; ++i) {
      var optionElement = document.createElement('li');
      optionElement.simpleSelectId = i;
      optionElement.innerText = options[i].text;
      this.optionsList.appendChild(optionElement);
      if(i == selectedIndex) {
        this.selectElement(i);
      }
    }

    // Assembling elements
    this.selectedLabel.appendChild(this.selectedLabelTxt);
    this.selectedLabel.appendChild(this.selectedLabelImg);
    this.replacementDiv.appendChild(this.selectedLabel);
    this.optionsArea.appendChild(this.optionsList);
    this.replacementDiv.appendChild(this.optionsArea);
    this.selectEl.parentNode.insertBefore(this.replacementDiv, this.selectEl);

    var _this = this;
    setTimeout(function() {
      // Delay setting events as the page is ready to be rendered.
      _this.initializeEvents();
    }, 0);
  };

  $.simpleSelect.closeAll = function(options) {
    var exceptId;
    if(options && options.except) {
      exceptId = options.except;
    }
    $('.simple_select').each(function() {
      var simpleSelect = this.simpleSelect;
      if(simpleSelect.selectEl.id != exceptId) {
        $(simpleSelect.optionsArea).hide();
      }
    });
  };

  $.simpleSelect.prototype = {
    initializeEvents: function() {
      var _this = this;
      $(this.optionsList.childNodes).click(function(e) {
        _this.selectElement(this.simpleSelectId, true);
      });

      $(this.selectedLabelImg).click(function(e) {
        $(_this.optionsArea).toggle();
      });

      $(document).click(function(e) {
        if(e.target != _this.selectedLabelImg) {
          $(_this.optionsArea).hide();
        }
      });
      $('.ui-tabs-nav li a').click(function(e) {
        if(e.target != _this.selectedLabelImg) {
          $(_this.optionsArea).hide();
        }
      });
    },

    selectElement: function(index, generateEvent) {
      if(generateEvent && this.changeCallback) {
        var optionEl = this.selectEl.options[index];
        var shouldSelect = this.changeCallback(optionEl.value, optionEl.text);
        if(!shouldSelect) {
          return;
        }
        $(this.optionsArea).toggle();
        $(this.optionsList.childNodes).attr('class', '');
      }
      var liEl = this.optionsList.childNodes[index];
      this.selectEl.selectedIndex = index;
      this.selectedLabelTxt.innerText = liEl.innerText;
      liEl.className = 'selected';
    }

  };

})(jQuery);