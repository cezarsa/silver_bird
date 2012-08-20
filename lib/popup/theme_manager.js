var ThemeManager = {
  init: function () {
    $("link.theme").remove();
    var theme = OptionsBackend.get('theme');
    $(theme.split(",")).each(function(i, p) {
      $("<link rel='stylesheet' type='text/css' class='theme' href='" + p + "'>").appendTo(document.head);
    });
    var baseStyle = $("#base_stylesheet")[0];
    if(baseStyle.sheet && baseStyle.sheet.cssRules) {
      var baseRules = baseStyle.sheet.cssRules;
      var fontFamily = OptionsBackend.get('font_family');
      var fontSize = OptionsBackend.get('font_size');
      for(var i = 0, len = baseRules.length; i < len; ++i) {
        var rule = baseRules[i];
        if(rule.selectorText == ".tweet") {
          rule.style.fontFamily = fontFamily;
          rule.style.fontSize = fontSize;
          break;
        }
      }
    }

    ThemeManager.isPopup = location.search == '?popup';
    ThemeManager.isDetached = location.search == '?detached';

    if(!ThemeManager.isPopup) {
      $('<base target="_blank">').appendTo(document.head);
    }

    var persistedPosition = Persistence.windowPosition();
    ThemeManager.detachedPos = persistedPosition.val();
    if(!ThemeManager.detachedPos) {
      // Setting default values
      ThemeManager.detachedPos = {
        left: 100,
        top: 100,
        height: null,
        width: null
      };
      persistedPosition.save(ThemeManager.detachedPos);
    }
    if(ThemeManager.isDetached) {
      $("#detach_img").hide();
      // Listening to resize and move events
      $(window).resize(function() {
        ThemeManager.detachedPos.height = window.innerHeight;
        ThemeManager.detachedPos.width = window.innerWidth;
        persistedPosition.save(ThemeManager.detachedPos);
      });
      setInterval(function() {
        if(ThemeManager.detachedPos.left != window.screenLeft || ThemeManager.detachedPos.top != window.screenTop) {
          ThemeManager.detachedPos.left = window.screenLeft;
          ThemeManager.detachedPos.top = window.screenTop;
          persistedPosition.save(ThemeManager.detachedPos);
        }
      }, 1000);
    }
  },

  setPopupSize: function(width, height, autoFitWidth) {
    if(!ThemeManager.isPopup) {
      return;
    }

    /* HACK: Magic numbers */
    var hackBordersWidth = 14;
    var hackTabsAdditionalWidth = 40;
    var hackHeaderHeight = 75;
    var hackMinValidHeight = 400;

    width = width || 490;
    height = height || 400;
    var minWidth = 450;
    var maxWidth = 800 - hackBordersWidth;
    if(width > maxWidth) {
      width = maxWidth;
    }
    if(width < minWidth) {
      width = minWidth;
    }
    if(autoFitWidth) {
      setTimeout(function() {
        var tabsBarWidth = 0;
        $("li.timeline_tab").each(function() {
          tabsBarWidth += $(this).width();
        });
        tabsBarWidth += hackTabsAdditionalWidth;
        if(tabsBarWidth > width) {
          ThemeManager.setPopupSize(tabsBarWidth, height);
        }
      }, 300);
    }

    $(".timeline").width(width + 'px');
    $(".inner_timeline,.timeline").height(height + 'px');

    setTimeout(function() {
      if(window.innerHeight < hackMinValidHeight) { return; }
      if(window.innerHeight < ($(".timeline").height() + hackHeaderHeight)) {
        var height = window.innerHeight - hackHeaderHeight;
        ThemeManager.setPopupSize(width, height, autoFitWidth);
      }
    }, 100);
  },

  popupSizeData: Persistence.popupSize(),

  initWindowResizing: function() {
    ThemeManager.handleWindowResizing();
    if(!ThemeManager.isPopup) {
      var resizeFunc = function() {
        var timelineHeight = window.innerHeight - 79;
        $('.inner_timeline,.timeline').css('maxHeight', timelineHeight + 'px');
      };
      $(window).resize(resizeFunc);
      resizeFunc();
      return;
    }
    $(".timeline").resizable({
      handles: 'e, s, se',
      minWidth: 450,
      resize: function(e, ui) {
        var $this = $(this);
        ThemeManager.setPopupSize($this.width(), $this.height());
      },
      stop: function(e, ui) {
        var $this = $(this);
        ThemeManager.popupSizeData.save($this.width() + 'x' + $this.height());
      }
    });
    $(".ui-resizable-handle").attr('title', chrome.i18n.getMessage("resetSize"));
    $(".ui-resizable-handle").dblclick(function(e) {
      ThemeManager.popupSizeData.remove();
      ThemeManager.setPopupSize(null, null, true);
    });
  },

  handleWindowResizing: function() {
    var sizeArray = ThemeManager.popupSizeData.val();
    if(sizeArray) {
      sizeArray = sizeArray.split('x');
      ThemeManager.setPopupSize(sizeArray[0], sizeArray[1], true);
    } else {
      ThemeManager.setPopupSize(null, null, true);
    }
  },

  sortableEl: null,
  uiTabs: null,
  handleSortableTabs: function() {
    this.uiTabs = $("#tabs");
    this.sortableEl = this.uiTabs.find(".ui-tabs-nav");
    this.sortableEl.sortable({
      stop: function(event, ui) {
        ThemeManager.updateTabsOrder();
      }
    });
  },

  reOrderPanels: function(sortedTimelines) {
    var panels = $("#tabs .ui-tabs-panel");
    for(var i = 0, len = sortedTimelines.length; i < len; ++i) {
      var correctTimeline = sortedTimelines[i];
      var correctPanel = $("#timeline-" + correctTimeline);
      var positionPanel = panels.eq(i);
      if(correctPanel[0].id != positionPanel[0].id) {
        var currentScroll = $('.inner_timeline', correctPanel).scrollTop();
        correctPanel.detach();
        positionPanel.before(correctPanel);
        $('.inner_timeline', correctPanel).scrollTop(currentScroll);
        panels = $("#tabs .ui-tabs-panel");
      }
    }
  },

  updateTabsOrder: function() {
    var sortedTabs = this.sortableEl.sortable('toArray');
    var sortedTimelines = [];
    for(var i = 0; i < sortedTabs.length; ++i) {
      sortedTimelines[i] = sortedTabs[i].split('-')[1];
    }
    tweetManager.setTimelineOrder(sortedTimelines);
    this.reOrderPanels(sortedTimelines);
    this.uiTabs.tabs('refreshPositions');
  }
};
