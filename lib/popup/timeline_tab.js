var TimelineTab = {
  init: function() {
    $("#tabs").tabs({
      panelTemplate: '<div class="timeline"><div class="inner_timeline"></div></div>',
      tabTemplate: '<li id="tab_#{href}" class="timeline_tab"><a href="#{href}"><span>#{label}</span></a></li>',
      selected: 0,
      select: function(event, ui) {
        tweetManager.previousTimelineId = tweetManager.currentTimelineId;
        tweetManager.currentTimelineId = ui.panel.id.split('-')[1];
        prepareAndLoadTimeline();
      },
      show: function(event, ui) {
        $('.inner_timeline', ui.panel).scrollTop(tweetManager.getCurrentTimeline().currentScroll);
      }
    });
  },

  addNewTab: function(templateId, automaticallyAdded) {
    var createdTimelines = tweetManager.showTimelineTemplate(templateId);
    if(templateId == TimelineTemplate.LISTS) {
      Lists.init();
    } else {
      for(var i = 0, len = createdTimelines.length; i < len; ++i) {
        var timeline = createdTimelines[i];
        pos = tweetManager.getTimelinePosition(timeline.timelineId);
        if(pos == -1) {
          pos = undefined;
        }
        if(templateId == TimelineTemplate.SEARCH) {
          SearchTab.addSearchTab(timeline.timelineId, pos, !automaticallyAdded);
        } else {
          TimelineTab.addTab(timeline.timelineId, timeline.template.timelineName, pos);
        }
      }
      ThemeManager.handleWindowResizing();
    }
    ThemeManager.updateTabsOrder();
    return createdTimelines;
  },

  addNewSearchTab: function(searchQuery, isBackground) {
    var searchTimeline;
    tweetManager.eachTimeline(function(timeline) {
      if(timeline.template.id == TimelineTemplate.SEARCH && timeline.getSearchQuery() == searchQuery) {
        searchTimeline = timeline;
        return false;
      }
      return true;
    });
    if(!searchTimeline) {
      searchTimeline = TimelineTab.addNewTab(TimelineTemplate.SEARCH, true)[0];
    }
    if(searchQuery) {
      SearchTab.updateSearch(searchTimeline.timelineId, searchQuery, isBackground);
    }
  },

  addTab: function(timelineId, tabName, pos) {
    var tabId = '#timeline-' + timelineId;
    $("#tabs").tabs('add', tabId, tabName, pos);
    var tabEl = $("#timeline-" + timelineId + ' .inner_timeline');
    tabEl.scroll(function(e) {
      var $this = $(this);
      var timeline = tweetManager.getTimeline(timelineId);
      var threshold = 50;
      timeline.currentScroll = $this.scrollTop();
      var maxScroll = $this.attr("scrollHeight") - $this.height();
      if(maxScroll - $this.scrollTop() < threshold) {
        if(!loadingNewTweets) {
          Paginator.nextPage();
        }
      }
    });
    ContextMenu.initSingleTimeline(timelineId);
  },

  removeTab: function(timelineId) {
    if(timelineId == tweetManager.currentTimelineId && tweetManager.previousTimelineId) {
      this.select(tweetManager.previousTimelineId);
    }
    $("#tabs > ul li:has(a[href])").each(function(index, el) {
      if($(el).attr('id') == 'tab_#timeline-' + timelineId) {
        $("#tabs").tabs('remove', index);
        return false;
      }
    });
    tweetManager.hideTimeline(timelineId);
    ThemeManager.handleWindowResizing();
    ThemeManager.updateTabsOrder();
  },

  select: function(timelineId) {
    $("#tabs").tabs('select', '#timeline-' + timelineId);
  }
};
