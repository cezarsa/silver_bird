var Lists = {
  selector_value: '__chromedbird__selector__',
  update_value: '__chromedbird__update_lists__',

  init: function(force) {
    var _this = this;
    tweetManager.lists(force, function(success, lists, status) {
      if(!window) { // Popup closed
        return;
      }
      if(!success) {
        if(force) {
          Renderer.showError(chrome.i18n.getMessage("ue_fetchingLists", status), Lists.init.bind(Lists, true));
          return;
        }
      }
      if(!lists) {
        lists = [];
      }
      tweetManager.eachTimeline(function(timeline) {
        if(timeline.template.id != TimelineTemplate.LISTS) {
          return true;
        }
        var $listSelect = $("select#" + timeline.timelineId + "-selector");
        if($listSelect.length === 0) {
          var pos = tweetManager.getTimelinePosition(timeline.timelineId);
          if(pos == -1) {
            pos = undefined;
          }
          TimelineTab.addTab(timeline.timelineId, '<select id="' + timeline.timelineId + '-selector"></select>', pos);
          $listSelect = $("select#" + timeline.timelineId + "-selector");
        }
        $listSelect.empty();
        $listSelect.append($("<option>").attr('value', _this.selector_value).text(chrome.i18n.getMessage("selectList")));
        for(var j = 0; j < lists.length; ++j) {
          $listSelect.append($("<option>").attr('value', lists[j].uri).text(lists[j].name));
        }
        $listSelect.append($("<option>").attr('value', _this.update_value).text(chrome.i18n.getMessage("updateLists")));
        var selectedListId = tweetManager.getListId(timeline.timelineId);
        if(selectedListId) {
          $listSelect.val(selectedListId);
        }
        $listSelect.simpleSelect({
          change: function(value, label) {
            if(value == _this.selector_value) {
              return false;
            }
            if(value == _this.update_value) {
              Lists.init(true);
              return true;
            }
            var timelineId = this.selectEl.id.split('-')[0];
            tweetManager.changeList(timelineId, value);
            Paginator.firstPage(true);
            prepareAndLoadTimeline();
            return true;
          }
        });
        return true;
      });
      ThemeManager.handleWindowResizing();
    });
  }
};
