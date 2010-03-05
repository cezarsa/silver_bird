
Persistence = {
  load: function (key) {
    return new ValueWrapper(key);
  },

  /* Creating helper methods for each persistence entry (load() shoudn't be used directly) */
  init: function() {
    var existingKeys = ['options', 'selected_lists', 'timeline_order', 'oauth_token_data',
      'oauth_token_service', 'version', 'popup_size'];

    var _this = this;
    for(var i = 0, len = existingKeys.length; i < len; ++i) {
      var currentKey = existingKeys[i];
      var methodName = currentKey.replace(/_(\w)/g, function(m1, m2) { return m2.toUpperCase(); });
      /* Ohh, so sad I can't just use the 'let' keyword */
      this[methodName] = (function(key) {
        return function() {
          return _this.load(key);
        }
      })(currentKey);
    }
  },

  cleanupOldData: function() {
    localStorage.removeItem('password');
    localStorage.removeItem('logged');
    localStorage.removeItem('username');
    localStorage.removeItem('remember');
    localStorage.removeItem('currentTheme');
  }
};
Persistence.init();

function ValueWrapper(key) {
  this.key = key;
}
ValueWrapper.prototype = {
  save: function(value) {
    localStorage[this.key] = value;
    return value;
  },
  val: function() {
    return localStorage[this.key];
  },
  remove: function() {
    return localStorage.removeItem(this.key);
  }
};