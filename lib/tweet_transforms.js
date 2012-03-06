var Transforms = {
  transformingSpan: document.createElement("span"),

  transformEntities: function(text) {
    Transforms.transformingSpan.innerHTML = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return Transforms.transformingSpan.textContent;
  },

  transformFactory: function(transformList) {
    return function(oldText) {
      var content = document.createElement("span");

      do {
        var bestTransform = null;
        var transformIndex = oldText.length;
        var bestLeft = oldText;
        var bestRight = "";

        for(var i = 0; i < transformList.length; ++i) {
          var matchGroups = transformList[i].expression.exec(oldText);
          if (matchGroups && matchGroups.index < transformIndex) {
            transformIndex = matchGroups.index;
            bestLeft = oldText.substring(0, matchGroups.index);
            bestRight = oldText.substring(matchGroups.index + matchGroups[0].length);
            bestTransform = transformList[i].replacement(matchGroups);
          }
        }

        if (bestLeft.length !== 0) {
          content.appendChild(document.createTextNode(Transforms.transformEntities(bestLeft)));
        }
        if (bestTransform !== null) {
          content.appendChild(bestTransform);
        }

        oldText = bestRight;
      } while (oldText !== "");

      return content;
    };
  }
};
