/*
Color distance algorithm based on:
http://www.emanueleferonato.com/2009/08/28/color-differences-algorithm/
http://www.emanueleferonato.com/2009/09/08/color-difference-algorithm-part-2/
by Emanuele Feronato
*/

IconCreator = {
  colorDistance: function (a, b) {
    var lab1 = this.XYZToLab(this.RGBToXYZ(a));
    var lab2 = this.XYZToLab(this.RGBToXYZ(b));

    var c1 = Math.sqrt(lab1[1] * lab1[1] + lab1[2] * lab1[2]);
    var c2 = Math.sqrt(lab2[1] * lab2[1] + lab2[2] * lab2[2]);
    var dc = c1 - c2;
    var dl = lab1[0] - lab2[0];
    var da = lab1[1] - lab2[1];
    var db = lab1[2] - lab2[2];
    var dh = Math.sqrt((da * da) + (db * db) - (dc * dc));
    var first = dl;
    var second =  dc / (1 + 0.045 * c1);
    var third = dh / (1 + 0.015 * c1);
    return Math.sqrt(first * first + second * second + third * third);
  },

  RGBToXYZ: function (rgb) {
    var rgbDec = [rgb.r / 255.0, rgb.g / 255.0, rgb.b / 255.0];

    for(var i = 0; i < 3; ++i) {
      var color = rgbDec[i];
      if(color > 0.04045) {
        color = (color + 0.055) / 1.055;
        color = Math.pow(color, 2.4);
      } else {
        color = color / 12.92;
      }
      rgbDec[i] = color * 100;
    }
    var x = rgbDec[0] * 0.4124 + rgbDec[1] * 0.3576 + rgbDec[2] * 0.1805;
    var y = rgbDec[0] * 0.2126 + rgbDec[1] * 0.7152 + rgbDec[2] * 0.0722;
    var z = rgbDec[0] * 0.0193 + rgbDec[1] * 0.1192 + rgbDec[2] * 0.9505;
    return [x, y, z];
  },

  XYZToLab: function (xyz) {
    var xyzAdj = [xyz[0] / 95.047, xyz[1] / 100, xyz[2] / 108.883];

    for(var i = 0; i < 3; ++i) {
      var color = xyzAdj[i];
      if(color > 0.008856) {
        color = Math.pow(color, 1 / 3.0);
      } else {
        color = (7.787 * color) + (16 / 116.0);
      }
      xyzAdj[i] = color;
    }

    var l = (116 * xyzAdj[1]) - 16;
    var a = 500 * (xyzAdj[0] - xyzAdj[1]);
    var b = 200 * (xyzAdj[1] - xyzAdj[2]);
    return [l, a, b];
  },

  HexToRGB: function (hex) {
    hex = parseInt(((hex.indexOf('#') > -1) ? hex.substring(1) : hex), 16);
    return {r: hex >> 16, g: (hex & 0x00FF00) >> 8, b: (hex & 0x0000FF), a: 1};
  },
  RGBAStrToRGB: function(rgbaStr) {
    var brokenValue = rgbaStr.replace(/rgba\s*\(([\d\s,.]*)\)/i, '$1').split(',');
    var rgbaValue = {
      r: parseInt($.trim(brokenValue[0]), 10),
      g: parseInt($.trim(brokenValue[1]), 10),
      b: parseInt($.trim(brokenValue[2]), 10),
      a: parseFloat($.trim(brokenValue[3]))
    };
    return rgbaValue;
  },
  StrToRGB: function(colorStr) {
    if(colorStr.indexOf('#') >= 0) {
      return this.HexToRGB(colorStr);
    }
    return this.RGBAStrToRGB(colorStr);
  },

  paintIcon: function (srcImage, color) {
    if(color.r || typeof color == 'string') {
      color = [color];
    }
    for(var i = 0; i < color.length; ++i) {
      if(typeof color[i] == 'string') {
        color[i] = this.StrToRGB(color[i]);
      }
    }

    var referenceColor = {r: 95, g: 167, b: 220};

    var img = srcImage;
    var ctx = $("<canvas width='" + srcImage.width + "' height='" + srcImage.height + "'>")[0].getContext("2d");
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(img, 0, 0);

    var imgData = ctx.getImageData(0, 0, 19, 19);
    var pixelData = imgData.data;
    var colorChangeInterval = (19 * 4) / color.length;
    for(var x = 0; x < 19; ++x) {
      for(var y = 0; y < (19 * 4); y += 4) {
        var currentColor = color[parseInt(y / colorChangeInterval, 10)];
        var pos = (x * 19 * 4) + y;
        var dist = this.colorDistance(referenceColor, {r: pixelData[pos + 0], g: pixelData[pos + 1], b: pixelData[pos + 2]});
        if(dist < 27) {
          var luminance = 0.3 * pixelData[pos + 0] + 0.59 * pixelData[pos + 1] + 0.11 * pixelData[pos + 2];
          pixelData[pos + 0] = currentColor.r * (luminance / 127);
          pixelData[pos + 1] = currentColor.g * (luminance / 127);
          pixelData[pos + 2] = currentColor.b * (luminance / 127);
          pixelData[pos + 3] = currentColor.a * pixelData[pos + 3];
        }
      }
    }
    return imgData;
  }
};