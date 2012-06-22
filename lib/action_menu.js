/*
$('#trigger').actionMenu({
  actions: [
    {
      name: 'Action 1',
      icon: 'img/action1.png', #optional
      action: function(event) { console.log('action 1 fired'); }
    },
    {
      name: 'Action 2',
      action: function(event) { console.log('action 2 fired'); }
    },
    {
      name: 'Action 3',
      action: function(event) {},
      second_level: true
    }
  ],
  parentContainer: '.selector'
});
*/
(function($) {
  var initialized = false;
  var activeActionMenu = null;

  $.fn.actionMenu = function(options) {
    $.actionMenu.init();
    return this.each(function() {
      var actionMenu = $(this).data('actionMenu');
      if(!actionMenu) {
        actionMenu = new $.actionMenu(this, options);
        $(this).data('actionMenu', actionMenu);
      }
      actionMenu.setOptions(options);
    });
  };

  $.actionMenu = function(triggerEl, actionMenuOptions) {
    this.triggerEl = $(triggerEl);
    this.actionMenuEl = $('<div>').addClass('action_menu');
    this.close();
    this.firstRun = true;
    this.visible = false;
    this.lastDirection = null;
    this.optionsChanged = false;

    var _this = this;
    this.triggerEl.anyClick(function(event) {
      _this.showActionMenu(event);
    });
  };

  $.actionMenu.init = function() {
    if(initialized) {
      return;
    }
    initialized = true;
    document.addEventListener('mouseup', function(event) {
      if(activeActionMenu && activeActionMenu.triggerEl[0] != event.target && activeActionMenu.secondLevelTrigger[0] != event.target) {
        activeActionMenu.close();
      }
    }, false);
  };

  $.actionMenu.prototype = {
    close: function() {
      if(this.visible && !this.closing) {
        activeActionMenu = null;
        this.closing = true;
        var _this = this;
        this.actionMenuEl.stop(true, true).effect('puff', {}, 150, function() {
          _this.actionMenuEl.css({display: 'none', position: 'absolute'});
          _this.visible = false;
          _this.closing = false;
        });
      }
    },

    showActionMenu: function(event) {
      if(this.optionsChanged) {
        this.reloadOptions();
      }

      if(!this.showMenu(event)) {
        this.close();
        return;
      }

      if(this.visible) {
        this.close();
        return;
      }

      if(activeActionMenu) {
        activeActionMenu.close();
      }
      activeActionMenu = this;

      if(this.firstRun) {
        this.container = this.triggerEl.parents(this.parentContainer);
        this.container.append(this.actionMenuEl);
        this.firstRun = false;
      }

      var direction = this.repositionActions();

      this.actionMenuEl.effect('bounce', {times: 2, direction: direction, distance: 10}, 200);
    },

    updateSecondLevelTrigger: function(direction) {
      var lastDirection = this.lastDirection;
      if(!direction) {
        direction = lastDirection;
      }
      var secondLevel = this.secondLevelTrigger;
      var secondLevelOpened = secondLevel.data('opened');
      if(secondLevelOpened) {
        if(direction == 'up') {
          secondLevel.html('&darr;');
        } else if(direction == 'down') {
          secondLevel.html('&uarr;');
        } else if(direction == 'right') {
          secondLevel.html('&larr;');
        } else if(direction == 'left') {
          secondLevel.html('&rarr;');
        }
      } else {
        if(direction == 'up') {
          secondLevel.html('&uarr;');
        } else if(direction == 'down') {
          secondLevel.html('&darr;');
        } else if(direction == 'right') {
          secondLevel.html('&rarr;');
        } else if(direction == 'left') {
          secondLevel.html('&larr;');
        }
      }
    },

    invertActions: function(direction, lastDirection) {
      var actionArea = this.actionAreaEl;
      actionArea.children().each(function() { actionArea.prepend(this); });
    },

    repositionActions: function() {
      this.updateVisibleActions();

      var triggerPos = this.triggerEl.offset();
      var containerPos = this.container.offset();
      triggerPos.top = (triggerPos.top - containerPos.top) + this.container.scrollTop();
      triggerPos.left = (triggerPos.left - containerPos.left) + this.container.scrollLeft();

      var triggerSize = {width: this.triggerEl.width(), height: this.triggerEl.height()};
      var windowSize = {width: this.container.width() + this.container.scrollLeft(), height: this.container.height() + this.container.scrollTop()};

      var availableSpaceRight = windowSize.width - (triggerPos.left + triggerSize.width);
      var availableSpaceLeft = triggerPos.left;
      var availableSpaceTop = triggerPos.top;
      var availableSpaceBottom = windowSize.height - (triggerPos.top + triggerSize.height);

      this.actionMenuEl.css({display: 'block'});
      this.actionMenuEl.removeClass('vertical');
      if(this.lastDirection) {
        this.actionMenuEl.removeClass(this.lastDirection);
      }
      this.actionMenuEl.addClass('horizontal');
      var actionMenuSize = {width: this.actionMenuEl.width(), height: this.actionMenuEl.height()};
      var direction;

      if(triggerPos.top < this.container.scrollTop()) {
        this.actionMenuEl.removeClass('horizontal');
        this.actionMenuEl.addClass('vertical');
        direction = 'down';
      } else {
        if(availableSpaceRight > actionMenuSize.width && availableSpaceBottom > actionMenuSize.height) {
          direction = 'right';
        } else if(availableSpaceLeft > actionMenuSize.width && availableSpaceBottom > actionMenuSize.height) {
          direction = 'left';
        } else {
          // change orientation
          this.actionMenuEl.removeClass('horizontal');
          this.actionMenuEl.addClass('vertical');
          actionMenuSize = {width: this.actionMenuEl.width(), height: this.actionMenuEl.height()};
          if(availableSpaceBottom > actionMenuSize.height) {
            direction = 'down';
          } else {
            direction = 'up';
          }
        }
      }

      var x, y;
      switch(direction) {
        case 'right':
          x = triggerPos.left + triggerSize.width;
          y = triggerPos.top;
          break;
        case 'left':
          x = triggerPos.left - actionMenuSize.width;
          y = triggerPos.top;
          break;
        case 'up':
          x = triggerPos.left;
          y = triggerPos.top - actionMenuSize.height;
          break;
        case 'down':
          x = triggerPos.left;
          y = triggerPos.top + triggerSize.height;
          break;
        default:
          // bug
          break;
      }

      // For up menus we have to reverse the order of the dom elements.
      if(direction == 'up') {
        if(this.lastDirection != 'up') {
          this.balloon.insertAfter(this.actionAreaEl);
        }
      } else if(this.lastDirection == 'up') {
        this.balloon.insertBefore(this.actionAreaEl);
      }

      if(direction == 'right' || direction == 'down') {
        if(this.lastDirection == 'left' || this.lastDirection == 'up') {
          this.invertActions(direction, this.lastDirection);
        }
      } else {
        if(this.lastDirection == 'right' || this.lastDirection == 'down' || !this.lastDirection) {
          this.invertActions(direction, this.lastDirection);
        }
      }

      this.updateSecondLevelTrigger(direction);

      this.lastDirection = direction;
      this.visible = true;
      this.actionMenuEl.css({left: x, top: y});
      this.actionMenuEl.addClass(direction);

      return direction;
    },

    updateVisibleActions: function() {
      for(var i = 0, len = this.actions.length; i < len; ++i) {
        var action = this.actions[i];
        if(action.condition) {
          var showAction = action.condition();
          var isShown = !action.actionEl.is('.conditionFalse');
          if(showAction) {
            if(!isShown) {
              action.actionEl.removeClass('conditionFalse');
            }
          } else {
            if(isShown) {
              action.actionEl.addClass('conditionFalse');
            }
          }
        }
      }
    },

    setOptions: function(options) {
      this.options = $.extend(this.options || {}, options);
      this.optionsChanged = true;
      if(this.visible) {
        this.reloadOptions();
        this.repositionActions();
      }
    },

    reloadOptions: function() {
      this.optionsChanged = false;
      this.showMenu = this.options.showMenu || function() { return true; };
      this.actions = this.options.actions || [];
      this.parentContainer = this.options.parentContainer;
      this.actionMenuEl.empty();
      this.actionAreaEl = $('<div>').addClass('action_area');
      this.secondLevelAreaEl = $('<div>').addClass('second_level');
      this.secondLevelTrigger = $('<div>').addClass('second_level_trigger');
      this.secondLevelTrigger.data('opened', false);

      this.balloon = $('<div>').addClass('balloon');
      this.actionMenuEl.append(this.balloon);
      this.actionMenuEl.append(this.actionAreaEl);
      var actionsLen = this.actions.length;
      if(actionsLen === 0 && !this.options.loading) {
        throw 'actions are mandatory';
      }
      if(actionsLen === 0) {
        this.actionAreaEl.append($('<img>').addClass('action_loading').attr('src', this.options.loading));
      }

      var _this = this;
      var secondLevelUsed = false;
      for(var i = 0; i < actionsLen; ++i) {
        (function(action) {
          action.actionEl = $('<div>').addClass('action');
          action.actionEl.anyClick(function(event) {
            return action.action(event);
          });
          if(action.icon) {
            var iconEl = $('<img>').attr('src', action.icon).attr('title', action.name);
            action.actionEl.append(iconEl);
          } else {
            var nameEl = $('<a>').attr('href', '#').text(action.name);
            action.actionEl.append(nameEl);
          }
          if(action.second_level) {
            action.actionEl.addClass('second_level second_level_hidden');
            if(!secondLevelUsed) {
              _this.actionAreaEl.append(_this.secondLevelTrigger);
            }
            secondLevelUsed = true;
          }
          _this.actionAreaEl.append(action.actionEl);
        })(this.actions[i]);
      }
      if(secondLevelUsed) {
        this.secondLevelTrigger.anyClick(function() {
          var secondLevelActions = $('.second_level', _this.actionAreaEl);
          if(_this.secondLevelTrigger.data('opened')) {
            secondLevelActions.addClass('second_level_hidden');
            _this.secondLevelTrigger.data('opened', false);
          } else {
            secondLevelActions.removeClass('second_level_hidden');
            _this.secondLevelTrigger.data('opened', true);
          }
          _this.repositionActions();
        });
      }
    }
  };

})(jQuery);