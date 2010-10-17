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
    }
  ],
  parentContainer: '.selector'
});
*/
(function($) {
  var initialized = false;
  var existingActionMenus = [];

  $.fn.actionMenu = function(options) {
    $.actionMenu.init();
    return this.each(function() {
      var actionMenu = $(this).data('actionMenu');
      if(!actionMenu) {
        actionMenu = new $.actionMenu(this, options);
        $(this).data('actionMenu', actionMenu);
        existingActionMenus.push(actionMenu);
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
    this.triggerEl.click(function(event) {
      event.preventDefault();
      _this.showActionMenu();
    });
  };

  $.actionMenu.init = function() {
    if(initialized) {
      return;
    }
    initialized = true;
    document.addEventListener('mouseup', function() {
      for(var i = 0, len = existingActionMenus.length; i < len; ++i) {
        var actionMenu = existingActionMenus[i];
        actionMenu.close();
      }
    }, false);
  };

  $.actionMenu.prototype = {
    close: function() {
      if(this.visible && !this.closing) {
        this.closing = true;
        var _this = this;
        this.actionMenuEl.stop(true, true).effect('puff', {}, 150, function() {
          _this.actionMenuEl.css({display: 'none', position: 'absolute'});
          _this.visible = false;
          _this.closing = false;
        });
      }
    },

    showActionMenu: function() {
      if(this.visible) {
        return;
      }

      if(this.optionsChanged) {
        this.reloadOptions();
      }

      if(this.firstRun) {
        this.container = this.triggerEl.parents(this.parentContainer);
        this.container.append(this.actionMenuEl);
        this.firstRun = false;
      }

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
          this.actionAreaEl.replaceWith(this.balloon).insertBefore(this.balloon);
        }
      } else if(this.lastDirection == 'up') {
        this.actionAreaEl.replaceWith(this.balloon).insertAfter(this.balloon);
      }
      this.lastDirection = direction;
      this.visible = true;
      this.actionMenuEl.css({left: x, top: y});
      this.actionMenuEl.addClass(direction);
      this.actionMenuEl.effect('bounce', {times: 2, direction: direction, distance: 10}, 200);
    },

    updateVisibleActions: function() {
      for(var i = 0, len = this.actions.length; i < len; ++i) {
        var action = this.actions[i];
        if(action.condition) {
          var showAction = action.condition();
          action.actionEl.toggle(showAction);
        }
      }
    },

    setOptions: function(options) {
      this.options = options;
      this.optionsChanged = true;
    },

    reloadOptions: function() {
      this.optionsChanged = false;
      this.actions = this.options.actions;
      this.parentContainer = this.options.parentContainer;
      this.actionMenuEl.empty();
      this.actionAreaEl = $('<div>').addClass('action_area');

      this.balloon = $('<div>').addClass('balloon');
      this.actionMenuEl.append(this.balloon);
      this.actionMenuEl.append(this.actionAreaEl);
      if(!this.actions || this.actions.length === 0) {
        throw 'actions are mandatory';
      }
      for(var i = 0, len = this.actions.length; i < len; ++i) {
        with({action: this.actions[i]}) {
          action.actionEl = $('<div>').addClass('action');
          action.actionEl.click(function(event) {
            event.preventDefault();
            return action.action(event);
          });
          if(action.icon) {
            var iconEl = $('<img>').attr('src', action.icon).attr('title', action.name);
            action.actionEl.append(iconEl);
          } else {
            var nameEl = $('<a>').attr('href', '#').html(action.name);
            action.actionEl.append(nameEl);
          }
          this.actionAreaEl.append(action.actionEl);
        }
      }
    }
  };

})(jQuery);