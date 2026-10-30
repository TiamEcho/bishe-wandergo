/* ============================================================
 * 坐标系转换工具：WGS84（GPS/OSM）↔ GCJ-02（高德/腾讯/中国地图）
 * 参考：国测局加密算法（火星坐标系）
 * 用法：
 *   CoordTransform.wgs84ToGcj02(lng, lat) -> [lng, lat]
 *   CoordTransform.gcj02ToWgs84(lng, lat) -> [lng, lat]
 *   CoordTransform.isOutOfChina(lng, lat) -> bool
 * ============================================================ */
(function(global){
  const PI = Math.PI;
  const a = 6378245.0;            /* 长半轴 */
  const ee = 0.00669342162296594323; /* 偏心率平方 */

  function outOfChina(lng, lat){
    return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55);
  }

  function transformLat(x, y){
    let ret = -100.0 + 2.0*x + 3.0*y + 0.2*y*y + 0.1*x*y + 0.2*Math.sqrt(Math.abs(x));
    ret += (20.0*Math.sin(6.0*x*PI) + 20.0*Math.sin(2.0*x*PI)) * 2.0 / 3.0;
    ret += (20.0*Math.sin(y*PI) + 40.0*Math.sin(y/3.0*PI)) * 2.0 / 3.0;
    ret += (160.0*Math.sin(y/12.0*PI) + 320*Math.sin(y*PI/30.0)) * 2.0 / 3.0;
    return ret;
  }

  function transformLng(x, y){
    let ret = 300.0 + x + 2.0*y + 0.1*x*x + 0.1*x*y + 0.1*Math.sqrt(Math.abs(x));
    ret += (20.0*Math.sin(6.0*x*PI) + 20.0*Math.sin(2.0*x*PI)) * 2.0 / 3.0;
    ret += (20.0*Math.sin(x*PI) + 40.0*Math.sin(x/3.0*PI)) * 2.0 / 3.0;
    ret += (150.0*Math.sin(x/12.0*PI) + 300.0*Math.sin(x/30.0*PI)) * 2.0 / 3.0;
    return ret;
  }

  /**
   * WGS84 → GCJ-02
   * @param {number} lng 经度
   * @param {number} lat 纬度
   * @returns {[number,number]} [lng, lat] in GCJ-02
   */
  function wgs84ToGcj02(lng, lat){
    if(outOfChina(lng, lat)) return [lng, lat];
    let dLat = transformLat(lng - 105.0, lat - 35.0);
    let dLng = transformLng(lng - 105.0, lat - 35.0);
    const radLat = lat / 180.0 * PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
    dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
    const mgLat = lat + dLat;
    const mgLng = lng + dLng;
    return [Number(mgLng.toFixed(6)), Number(mgLat.toFixed(6))];
  }

  /**
   * GCJ-02 → WGS84（精确迭代版）
   * @param {number} lng 经度
   * @param {number} lat 纬度
   * @returns {[number,number]} [lng, lat] in WGS84
   */
  function gcj02ToWgs84(lng, lat){
    if(outOfChina(lng, lat)) return [lng, lat];
    /* 先粗略反算，再迭代修正 */
    let [tLng, tLat] = wgs84ToGcj02(lng, lat);
    let dLng = tLng - lng, dLat = tLat - lat;
    let wgsLng = lng - dLng, wgsLat = lat - dLat;
    /* 迭代一次提高精度 */
    [tLng, tLat] = wgs84ToGcj02(wgsLng, wgsLat);
    dLng = tLng - lng; dLat = tLat - lat;
    wgsLng = lng - dLng; wgsLat = lat - dLat;
    return [Number(wgsLng.toFixed(6)), Number(wgsLat.toFixed(6))];
  }

  /**
   * 批量转换坐标数组
   * @param {Array} points [[lng,lat], ...]
   * @param {string} from 'wgs84'|'gcj02'
   * @param {string} to   'wgs84'|'gcj02'
   */
  function convertBatch(points, from, to){
    const fn = (from==='wgs84'&&to==='gcj02') ? wgs84ToGcj02
             : (from==='gcj02'&&to==='wgs84') ? gcj02ToWgs84
             : (lng,lat)=>[lng,lat];
    return points.map(p=>fn(p[0], p[1]));
  }

  const CoordTransform = {
    wgs84ToGcj02, gcj02ToWgs84, convertBatch,
    isOutOfChina: outOfChina,
    /* 中国境外坐标直接原样返回（无偏移） */
    safeConvert: function(lng, lat, target){
      if(outOfChina(lng, lat)) return [lng, lat];
      return target==='gcj02' ? wgs84ToGcj02(lng, lat) : gcj02ToWgs84(lng, lat);
    }
  };

  global.CoordTransform = CoordTransform;
  if(typeof module!=='undefined' && module.exports) module.exports = CoordTransform;
})(typeof window!=='undefined'?window:globalThis);
