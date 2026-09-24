(function(){
"use strict";

/* =========================================================================
   ЧАСТЬ 1 - ЭФЕМЕРИДНЫЙ ДВИЖОК (упрощённые орбитальные элементы, метод Paul
   Schlyter, epoch J2000; точность ~1 угловая минута - достаточно для
   определения знака/ретроградности на десятилетия вперёд). Никаких
   выдуманных данных - реальная небесная механика в браузере.
   ========================================================================= */
  var RAD = Math.PI/180;

  function rev(x){ x = x - Math.floor(x/360)*360; return x<0? x+360 : x; }

  // дней с 2000-01-00.0 UT (эпоха Schlyter)
  function daysSinceEpoch(date){
    var y=date.getUTCFullYear(), m=date.getUTCMonth()+1,
        d=date.getUTCDate() + (date.getUTCHours() + date.getUTCMinutes()/60)/24;
    return 367*y - Math.floor(7*(y+Math.floor((m+9)/12))/4) + Math.floor(275*m/9) + d - 730530;
  }

  function eccAnomaly(Mdeg, e){
    var M = rev(Mdeg)*RAD;
    var E = M + e*Math.sin(M)*(1+e*Math.cos(M));
    for (var i=0;i<8;i++){
      var dE = (E - e*Math.sin(E) - M) / (1 - e*Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-7) break;
    }
    return E; // радианы
  }

  // орбитальные элементы (град, град/сутки применяется через d) - Schlyter, эпоха 2000.0
  var ELEMENTS = {
    sun:     function(d){ return {N:0, i:0, w: rev(282.9404 + 4.70935e-5*d), a:1.000000, e: 0.016709 - 1.151e-9*d, M: rev(356.0470 + 0.9856002585*d)}; },
    moon:    function(d){ return {N: rev(125.1228 - 0.0529538083*d), i:5.1454, w: rev(318.0634 + 0.1643573223*d), a:60.2666, e:0.054900, M: rev(115.3654 + 13.0649929509*d)}; },
    mercury: function(d){ return {N: rev(48.3313 + 3.24587e-5*d), i: 7.0047 + 5.00e-8*d, w: rev(29.1241 + 1.01444e-5*d), a:0.387098, e:0.205635 + 5.59e-10*d, M: rev(168.6562 + 4.0923344368*d)}; },
    venus:   function(d){ return {N: rev(76.6799 + 2.46590e-5*d), i: 3.3946 + 2.75e-8*d, w: rev(54.8910 + 1.38374e-5*d), a:0.723330, e:0.006773 - 1.302e-9*d, M: rev(48.0052 + 1.6021302244*d)}; },
    mars:    function(d){ return {N: rev(49.5574 + 2.11081e-5*d), i: 1.8497 - 1.78e-8*d, w: rev(286.5016 + 2.92961e-5*d), a:1.523688, e:0.093405 + 2.516e-9*d, M: rev(18.6021 + 0.5240207766*d)}; },
    jupiter: function(d){ return {N: rev(100.4542 + 2.76854e-5*d), i: 1.3030 - 1.557e-7*d, w: rev(273.8777 + 1.64505e-5*d), a:5.20256, e:0.048498 + 4.469e-9*d, M: rev(19.8950 + 0.0830853001*d)}; },
    saturn:  function(d){ return {N: rev(113.6634 + 2.38980e-5*d), i: 2.4886 - 1.081e-7*d, w: rev(339.3939 + 2.97661e-5*d), a:9.55475, e:0.055546 - 9.499e-9*d, M: rev(316.9670 + 0.0334442282*d)}; }
  };

  function orbitalToEcliptic(el){
    var E = eccAnomaly(el.M, el.e);
    var xv = el.a*(Math.cos(E) - el.e);
    var yv = el.a*(Math.sqrt(1-el.e*el.e)*Math.sin(E));
    var v = rev(Math.atan2(yv,xv)/RAD);
    var r = Math.sqrt(xv*xv+yv*yv);
    var Nr=el.N*RAD, ir=el.i*RAD, vwr=(v+el.w)*RAD;
    var xh = r*(Math.cos(Nr)*Math.cos(vwr) - Math.sin(Nr)*Math.sin(vwr)*Math.cos(ir));
    var yh = r*(Math.sin(Nr)*Math.cos(vwr) + Math.cos(Nr)*Math.sin(vwr)*Math.cos(ir));
    var zh = r*(Math.sin(vwr)*Math.sin(ir));
    return {x:xh,y:yh,z:zh,r:r};
  }

  // геоцентрическая эклиптическая долгота (град, 0-360) планеты/Солнца/Луны на дату
  function geoLongitude(planet, date){
    var d = daysSinceEpoch(date);
    var sunEl = ELEMENTS.sun(d);
    var sunPos = orbitalToEcliptic(sunEl); // = позиция Солнца относительно Земли (i=0 у элементов Солнца)
    if (planet === 'sun') return rev(Math.atan2(sunPos.y, sunPos.x)/RAD);
    if (planet === 'moon'){
      var m = orbitalToEcliptic(ELEMENTS.moon(d));
      return rev(Math.atan2(m.y, m.x)/RAD);
    }
    var p = orbitalToEcliptic(ELEMENTS[planet](d));
    // геоцентрич. = гелиоцентрич.планеты + гелиоцентрич.Земли(= позиция Солнца от Земли)
    var xg = p.x + sunPos.x, yg = p.y + sunPos.y;
    return rev(Math.atan2(yg,xg)/RAD);
  }

  var SIGNS = ["Овен","Телец","Близнецы","Рак","Лев","Дева","Весы","Скорпион","Стрелец","Козерог","Водолей","Рыбы"];
  var SIGN_GEN = ["Овна","Тельца","Близнецов","Рака","Льва","Девы","Весов","Скорпиона","Стрельца","Козерога","Водолея","Рыб"]; // родительный падеж "в знаке Х"
  var SIGN_LOC = ["Овне","Тельце","Близнецах","Раке","Льве","Деве","Весах","Скорпионе","Стрельце","Козероге","Водолее","Рыбах"]; // предложный "в Х"

  function signIndex(lon){ return Math.floor(rev(lon)/30) % 12; }

  function isRetrograde(planet, date){
    var d1 = new Date(date.getTime() - 36*3600*1000);
    var d2 = new Date(date.getTime() + 36*3600*1000);
    var l1 = geoLongitude(planet, d1), l2 = geoLongitude(planet, d2);
    var delta = l2 - l1;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return delta < 0;
  }

  // знак рождения (тропический, по календарной дате - стандартная астрологическая конвенция)
  var SUN_SIGN_RANGES = [
    [1,20,2,18,"Водолей"], [2,19,3,20,"Рыбы"], [3,21,4,19,"Овен"], [4,20,5,20,"Телец"],
    [5,21,6,20,"Близнецы"], [6,21,7,22,"Рак"], [7,23,8,22,"Лев"], [8,23,9,22,"Дева"],
    [9,23,10,22,"Весы"], [10,23,11,21,"Скорпион"], [11,22,12,21,"Стрелец"], [12,22,1,19,"Козерог"]
  ];
  function sunSignFromDate(day, month){
    for (var i=0;i<SUN_SIGN_RANGES.length;i++){
      var r = SUN_SIGN_RANGES[i];
      var afterStart = (month===r[0] && day>=r[1]) || (month>r[0] && r[0]<r[2]);
      var beforeEnd = (month===r[2] && day<=r[3]);
      if (r[0] < r[2]){
        if ((month===r[0] && day>=r[1]) || (month>r[0] && month<r[2]) || (month===r[2] && day<=r[3])) return SIGNS.indexOf(r[4]);
      } else { // диапазон через новый год (Козерог)
        if ((month===r[0] && day>=r[1]) || (month===r[2] && day<=r[3])) return SIGNS.indexOf(r[4]);
      }
    }
    return 0;
  }

  // сканирование месяца: найти дату(ы) входа планеты в новый знак и станции ретроградности
  function scanMonthEvents(planet, year, month){
    var events = []; // {day, type:'ingress'|'stationR'|'stationD', sign}
    var daysInMonth = new Date(year, month+1, 0).getDate();
    var prevSign = null, prevRetro = null;
    for (var day=1; day<=daysInMonth+1; day++){
      var dt = new Date(Date.UTC(year, month, Math.min(day,daysInMonth), 12, 0, 0));
      var lon = geoLongitude(planet, dt);
      var sg = signIndex(lon);
      var rt = isRetrograde(planet, dt);
      if (prevSign !== null && sg !== prevSign && day<=daysInMonth) events.push({day:day, type:'ingress', sign:sg});
      if (prevRetro !== null && rt !== prevRetro && day<=daysInMonth) events.push({day:day, type: rt? 'stationR':'stationD', sign:sg});
      prevSign = sg; prevRetro = rt;
    }
    return events;
  }

  // дни месяца, когда Луна образует нужный канонический аспект (0..6) к знаку userSignIdx
  function moonAspectDays(year, month, userSignIdx, wantCanonical, limit){
    var res = [];
    var daysInMonth = new Date(year, month+1, 0).getDate();
    for (var day=1; day<=daysInMonth && res.length<limit; day++){
      var dt = new Date(Date.UTC(year, month, day, 12, 0, 0));
      var lon = geoLongitude('moon', dt);
      var sg = signIndex(lon);
      var offset = (sg - userSignIdx + 12) % 12;
      var canonical = Math.min(offset, 12-offset);
      if (wantCanonical.indexOf(canonical) !== -1) res.push(day);
    }
    return res;
  }

  function canonicalOffset(signA, signB){
    var offset = (signA - signB + 12) % 12;
    return Math.min(offset, 12-offset);
  }
  function rawOffset(signA, signB){
    return (signA - signB + 12) % 12;
  }


window.ASTRO={SIGNS:SIGNS,SIGN_LOC:SIGN_LOC,SIGN_GEN:SIGN_GEN,geoLongitude:geoLongitude,signIndex:signIndex,isRetrograde:isRetrograde,sunSignFromDate:sunSignFromDate,scanMonthEvents:scanMonthEvents,moonAspectDays:moonAspectDays,canonicalOffset:canonicalOffset,rawOffset:rawOffset};
})();
