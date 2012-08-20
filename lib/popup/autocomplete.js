var Autocomplete = {
  startPosition: 0,

  init: function() {
    if(!OptionsBackend.get('show_user_autocomplete')) {
      return;
    }
    var autocompleteElement = null;
    $("#compose_tweet_area textarea").autocomplete({
      source: function(request, response) {
        response(Autocomplete.autocomplete(request.term));
      },
      focus: function(event, ui) {
        var oldLen = this.value.length;
        this.value = this.value.substring(0, Autocomplete.startPosition) + ui.item.value;
        this.setSelectionRange(oldLen, this.value.length);
        return false;
      },
      select: function(event, ui) {
        this.value = this.value.substring(0, Autocomplete.startPosition) + ui.item.value + ' ';
        var valueLen = this.value.length;
        this.setSelectionRange(valueLen, valueLen);
        return false;
      },
      open: function(event, ui) {
        autocompleteElement.menu.element.css({
          overflow: 'auto',
          maxHeight: '200px'
        });
      }
    });
    autocompleteElement = $("#compose_tweet_area textarea").data("autocomplete");
  },

  autocomplete: function(hintStr) {
    var usersList = tweetManager.getFollowingUsers();
    if(usersList === null || usersList.length === 0) {
      return [];
    }
    var lastSpaceIdx = hintStr.lastIndexOf(' ');
    if(hintStr.substr(lastSpaceIdx + 1, 1) == '@') {
      this.startPosition = lastSpaceIdx + 2;
    } else if(lastSpaceIdx == 1 && hintStr.substr(0, 1) == 'd') {
      this.startPosition = 2;
    } else {
      return [];
    }
    hintStr = hintStr.substr(this.startPosition).toLowerCase();
    var validScreenNames = [];
    for(var i = 0, len = usersList.length; i < len; ++i) {
      var user = usersList[i];
      if(user.toLowerCase().indexOf(hintStr) === 0) {
        validScreenNames.push(user);
      }
    }
    return validScreenNames;
  }
};
