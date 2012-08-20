var SearchTab = {
  addSearchTab: function(timelineId, pos, setFocus) {
    var inputHtml = '<input type="text" spellcheck="false" class="search_selector" id="' + timelineId + '-selector"></input>';
    TimelineTab.addTab(timelineId, inputHtml, pos);
    var inputEl = $('input#' + timelineId + '-selector');
    inputEl.val(tweetManager.getSearchQuery(timelineId));
    if(setFocus) {
      inputEl.focus();
    }

    inputEl.blur(function(e) {
      SearchTab.updateSearchEvent(e);
    });
    inputEl.keyup(function(e) {
      if(e && e.which == 13) { // Enter
        inputEl.blur();
      }
    });
  },

  updateSearchEvent: function(e) {
    var timelineId = e.target.id.split('-')[0];
    var searchQuery = $(e.target).val();
    SearchTab.updateSearch(timelineId, searchQuery, false);
  },

  updateSearch: function(timelineId, searchQuery, isBackground) {
    if(!isBackground) {
      TimelineTab.select(timelineId);
    }
    $('#' + timelineId + '-selector').val(searchQuery);
    if(tweetManager.changeSearch(timelineId, searchQuery)) {
      if(!isBackground) {
        Paginator.firstPage(true);
        prepareAndLoadTimeline();
      }
    }
  }
};
