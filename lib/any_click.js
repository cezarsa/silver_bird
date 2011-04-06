var AnyClick = {
  waitingUp: [],
  initiated: false,
  init: function(options) {
    this.initiated = true;
    var _this = this;
    document.addEventListener('mouseup', function() {
      _this.clearEventListeners();
    }, false);
  },
  clearEventListeners: function() {
    for(var i = 0, len = this.waitingUp.length; i < len; ++i) {
      var el = this.waitingUp[i].element;
      el.removeEventListener('mouseup', this.waitingUp[i].listener, true);
    }
    if(len > 0) {
      this.waitingUp = [];
    }
  },
  anyClick: function(el, clickCallback) {
    if(!this.initiated) {
      this.init();
    }
    var _this = this;
    el.addEventListener('click', function(event) {
      if(event.button != 2) {
        event.preventDefault();
      }
    }, true);
    el.addEventListener('mousedown', function() {
      var listener = function(event) {
        event.preventDefault();
        event.isAlternateClick = event.button == 1 || event.metaKey || event.ctrlKey;
        clickCallback(event);
        _this.clearEventListeners();
      };
      _this.waitingUp.push({element: this, listener: listener});
      el.addEventListener('mouseup', listener, true);
    }, true);
  }
};

// JQuery Helper
(function($) {
  $.fn.anyClick = function(callback) {
    return this.each(function() {
      AnyClick.anyClick(this, callback);
    });
  };
})(jQuery);