var Paginator = {
  needsMore: false,
  firstPage: function(shouldScrollTop) {
    this.needsMore = false;
    if(shouldScrollTop) {
      $("#timeline-" + tweetManager.currentTimelineId + ' .inner_timeline').scrollTop(0);
      tweetManager.getCurrentTimeline().currentScroll = 0;
    }
  },
  nextPage: function() {
    this.needsMore = true;
    loadTimeline();
  }
};
