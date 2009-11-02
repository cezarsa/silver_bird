(function($) {
  $.fn.replaceHtml = function (regex, replacement) {
    return this.each(function() {
      var oldHtml = $(this).html();
      var newHtml = '';
      if(replacement instanceof Function) {
        var splitStr = oldHtml.split(regex);
        for(var i = 0; i < splitStr.length; ++i) {
          if(splitStr[i].match(regex)) {
            splitStr[i] = replacement(splitStr[i]);
          }
          newHtml += splitStr[i];
        }
      } else {
        newHtml = oldHtml.replace(regex, replacement)
      }
      $(this).html(newHtml);
    });
  };
})($);