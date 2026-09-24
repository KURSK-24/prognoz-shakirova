/* =========================================================================
   Прогноз на месяц - интерпретация и интерфейс
   Астролог без магии · Наталья Шакирова

   Математика неба живёт в engine.js (реальные эфемериды, метод Schlyter).
   Здесь только смысловой слой: аспект медленной планеты к знаку Солнца
   человека -> сценарий месяца -> реальные даты -> микродействие ->
   конкретный вопрос, который решается одним хораром.
   Выдуманных данных нет: все даты и ретроградности считаются, не вписаны руками.
   ========================================================================= */
(function(){
"use strict";

var A = window.ASTRO;

var MONTHS_NOM = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
var MONTHS_PRE = ["январе","феврале","марте","апреле","мае","июне","июле","августе","сентябре","октябре","ноябре","декабре"];
var MONTHS_GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

var PLANET_NAME = {venus:"Венера", mars:"Марс", jupiter:"Юпитер", saturn:"Сатурн", mercury:"Меркурий"};
var PLANET_GEN  = {venus:"Венеры", mars:"Марса", jupiter:"Юпитера", saturn:"Сатурна", mercury:"Меркурия"};

/* Трудные и лёгкие канонические типы аспекта (0 - соединение, 3 - квадрат,
   5 - квиконс, 6 - оппозиция считаем напряжёнными; 1, 2, 4 - рабочими) */
var HARD = {0:1, 3:1, 5:1, 6:1};

/* Сценарий месяца - механика аспекта человеческим языком, голос Натальи.
   По два варианта на тип, чтобы у разных сфер одного человека не совпадал текст. */
var SCENARIO = {
  0: [
    function(p,s,g){ return p+" сейчас стоит прямо в вашем знаке, в "+s+". Это не фон где-то рядом, это по вам напрямую. Всё, что обычно приглушено, в этом месяце звучит в полный голос и требует ответа, а не отговорок"; },
    function(p,s,g){ return p+" встал ровно в "+s+", в вашем знаке. Усиление в чистом виде: то, что вы привыкли не замечать, сейчас вылезет и будет требовать решения"; }
  ],
  1: [
    function(p,s,g){ return p+" в "+s+" чуть сбивает ваш обычный ритм. Ничего страшного, но привычные схемы будут спотыкаться на мелочах, и раздражать это будет сильнее, чем заслуживает"; },
    function(p,s,g){ return p+" идёт по "+s+" и слегка не попадает в ваш темп. То, что раньше делалось на автомате, в этом месяце просит внимания к деталям"; }
  ],
  2: [
    function(p,s,g){ return p+" в "+s+" открывает вам узкое, но настоящее окно. Само ничего не упадёт, но если сделаете первый шаг, сработает быстрее обычного"; },
    function(p,s,g){ return p+" в "+s+" работает с вами заодно. Это не громкая удача, а рабочая поддержка: то, что вы двигали месяцами, сейчас пойдёт легче"; }
  ],
  3: [
    function(p,s,g){ return p+" в "+s+" встаёт к вашему знаку под прямым углом. Трение настоящее, и именно оно двигает: то, что стояло месяцами, в этом месяце потребует решения"; },
    function(p,s,g){ return p+" давит на ваш знак из "+g+". Конфликт, который вы успешно откладывали, откладывать больше не выйдет"; }
  ],
  4: [
    function(p,s,g){ return p+" в "+s+" идёт с вашим знаком в одном русле. Поддержка приходит почти без усилий, и риск тут ровно один - расслабиться и проспать момент, пока он есть"; },
    function(p,s,g){ return p+" в "+s+" течёт с вами в такт. Редкий случай, когда усилие и результат совпадают без надрыва. Не проспите"; }
  ],
  5: [
    function(p,s,g){ return p+" в "+s+" создаёт рассинхрон: логика месяца и ваша собственная логика тянут в разные стороны. Придётся выбирать, а не сидеть на двух стульях"; },
    function(p,s,g){ return p+" смотрит на ваш знак из "+g+" искоса. Вроде всё по плану, но что-то постоянно приходится подкручивать на ходу"; }
  ],
  6: [
    function(p,s,g){ return p+" в "+s+" стоит ровно напротив вашего знака. Это зеркало, а не нападение: то, что бесит сейчас в других, стоит поискать в себе"; },
    function(p,s,g){ return p+" тянет одеяло с противоположной стороны вашего круга, из "+g+". Месяц про равновесие между «хочу как я» и «надо как другому»"; }
  ]
};

/* Фраза про Солнце - обновляется каждый месяц, даже если медленная планета
   стоит в том же знаке уже полгода */
var SUN_FLAVOR = {
  0:"Солнце в этом месяце проходит через ваш знак: ваш личный новый год, время заявлять о себе громче обычного",
  1:"Солнце идёт по касательной к вашему знаку: месяц тихой перестройки, без резких разворотов",
  2:"Солнце в этом месяце вас поддерживает: хорошее время для новых контактов и небольших смелых шагов",
  3:"Солнце давит на ваш знак с напряжением: внешней суеты и чужих требований будет больше обычного",
  4:"Солнце течёт с вашим знаком в одном направлении: многое в этом месяце даётся проще",
  5:"Солнце сбивает привычный ритм вашего знака: придётся больше подстраиваться под обстоятельства",
  6:"Солнце стоит напротив вашего знака: месяц про баланс с окружающими, не про перетягивание каната"
};

var SPHERES = [
  {
    key:"money", title:"Деньги", icon:"₽", base:"jupiter", own:["jupiter","mercury"],
    lead:{
      hard:"В деньгах это читается прямо: тянет вписаться в то, что выглядит быстрым и красивым, а на деле не проверено. И тянет закрыть тревогу покупкой",
      easy:"В деньгах это читается как окно. Не шальные деньги с неба, а реальная возможность закрыть то, что вы давно откладывали"
    },
    todo:{
      hard:"Ничего крупного не подписывайте и не переводите в порыве. Выждите сутки, перечитайте договор и зафиксируйте только то, что уже реально ваше",
      easy:"Сделайте тот звонок или запрос по деньгам, который откладывали. Сейчас вас услышат быстрее обычного"
    },
    moonEasy:["Лёгкий денежный день: удачно просить, предлагать, закрывать вопрос по оплате","Ещё один день на подъёме: хорошо назначать встречи про деньги именно на него"],
    moonHard:["Напряжённый денежный день: легко потратить на эмоциях и переоценить силы","Ещё один день на пределе: не лучший момент занимать и одалживать, эмоции сильнее расчёта"],
    ask:{
      hard:"Вернут ли мне эти деньги, и если да, то когда?",
      easy:"Состоится ли эта сделка и получу ли я то, на что рассчитываю?"
    }
  },
  {
    key:"love", title:"Отношения", icon:"♥", base:"venus", own:["venus"],
    lead:{
      hard:"В отношениях это трение на ровном месте. Спор из-за того, что вчера прошло бы мимо ушей. Дело не в человеке напротив, а в том, что месяц обостряет реакции у обоих",
      easy:"В отношениях это тепло, которое приходит само. Близость, разговор без брони, момент, когда легче услышать другого и признаться себе"
    },
    todo:{
      hard:"Отложите выяснение до дня, когда отпустит. Сказанное сейчас запомнится дольше, чем оно того стоит",
      easy:"Не ждите повода и не ждите первого шага: напишите или позовите сами, сейчас это примут теплее"
    },
    moonEasy:["Мягкий день для разговора: хорошо для близости и честных слов","Ещё один тёплый день: подходит для разговора, который вы откладывали"],
    moonHard:["Острый день в отношениях: раздражительность выше нормы, не выясняйте отношения сегодня","Ещё один резкий день: слова прозвучат жёстче, чем вы имели в виду"],
    ask:{
      hard:"Это временная ссора или мы уже идём к разводу / разрыву?",
      easy:"Есть ли у этих отношений будущее или я придумываю себе?"
    }
  },
  {
    key:"work", title:"Дело и карьера", icon:"◆", base:"mars", own:["mars"],
    lead:{
      hard:"В работе это давление. Планы буксуют, согласования тянутся, ответа от руководства или партнёров нет. Это не значит, что идея плохая. Это значит, что момент просит пересборки, а не паники",
      easy:"В работе это ход вперёд. Появляется энергия, которая двигает задачи, стоявшие неделями. То, на что раньше уходило три подхода, сейчас получится с первого"
    },
    todo:{
      hard:"Не продавливайте и не увольняйтесь на эмоции. Разберите задачу на три шага и сделайте только первый, остальное решится, когда спадёт напряжение",
      easy:"Заявите о себе: отправьте предложение, попросите повышение, начните то, что тянули. Сейчас ваш ход стоит дороже"
    },
    moonEasy:["Рабочий день на подъёме: хорошо для переговоров и заявлений о себе","Ещё один сильный день: подходит для старта и первых шагов"],
    moonHard:["Тяжёлый рабочий день: высокий риск конфликта с коллегами, не начинайте новое","Ещё один буксующий день: согласования затянутся, не назначайте важное"],
    ask:{
      hard:"Уходить с этой работы сейчас или дождаться?",
      easy:"Возьмут ли меня, если я подам резюме сейчас?"
    }
  },
  {
    key:"power", title:"Ресурс и состояние", icon:"◐", base:"saturn", own:["saturn"],
    lead:{
      hard:"По ресурсу это та самая батарейка на нуле. Силы уходят не на дела, а на мыслежвачку: прокрутить разговор, представить худшее, поспорить в голове с тем, кого рядом нет",
      easy:"По ресурсу это редкое состояние, когда силы есть и они ровные. Не эйфория, а спокойная тяга: можно вернуться к тому, что забросили из-за усталости"
    },
    todo:{
      hard:"Снимите с себя один пункт из списка на этой неделе. Не героически дотяните, а именно снимите. Проверьте, где утекает: чаще всего это чужая обязанность, которую вы молча несёте",
      easy:"Возьмите то, что давно откладывали из-за нехватки сил. Сейчас вы это вытянете без надрыва"
    },
    moonEasy:["Спокойный день: хорошо восстанавливаться и планировать","Ещё один ровный день: подходит, чтобы разобрать накопившееся без спешки"],
    moonHard:["День утечки сил: высокая тревожность, лучше разгрузить день и лечь раньше","Ещё один день на минимуме: не назначайте на него ничего, что требует выдержки"],
    ask:{
      hard:"Потяну ли я эту нагрузку до конца года или пора снимать с себя часть?",
      easy:"Стоит ли мне сейчас браться за то, что я давно откладываю?"
    }
  }
];

function pick(arr, seed){ return arr[seed % arr.length]; }

/* Правило автора: всё, что стоит до двоеточия, выделяем жирным. */
function hl(text){
  var i = text.indexOf(":");
  if (i === -1) return text;
  return "<b>" + text.slice(0, i+1) + "</b>" + text.slice(i+1);
}

function listDays(days, month){
  if (!days.length) return "";
  if (days.length === 1) return days[0] + " " + MONTHS_GEN[month];
  return days.slice(0,-1).join(", ") + " и " + days[days.length-1] + " " + MONTHS_GEN[month];
}

/* Луна возвращается в тот же аспект раз в ~27 дней, поэтому подходящие дни
   идут слипшимися группами (10, 11, 12, 13...). Берём по одному дню из группы
   и держим зазор минимум в 4 дня от всех уже занятых дат сферы, чтобы в списке
   не было ни повторов одной даты, ни дат подряд. taken пополняется на месте. */
var MIN_GAP = 4;
function pickSpaced(days, need, taken, offset){
  if (!days.length) return [];
  var groups = [[days[0]]];
  for (var i=1;i<days.length;i++){
    if (days[i] - days[i-1] <= 1) groups[groups.length-1].push(days[i]);
    else groups.push([days[i]]);
  }
  var reps = groups.map(function(g){ return g[Math.floor(g.length/2)]; });
  // Сдвигаем точку входа по номеру сферы: Луна в один день задевает несколько
  // сфер сразу, и без сдвига одна дата попадала бы во все четыре списка.
  if (offset && reps.length > 1){
    var cut = offset % reps.length;
    reps = reps.slice(cut).concat(reps.slice(0, cut));
  }
  var out = [];
  for (var r=0;r<reps.length && out.length<need;r++){
    var d = reps[r], ok = true;
    for (var t=0;t<taken.length;t++){ if (Math.abs(taken[t]-d) < MIN_GAP){ ok = false; break; } }
    if (!ok) continue;
    out.push(d); taken.push(d);
  }
  return out;
}

function planetEvents(planet, year, month){
  var ev = A.scanMonthEvents(planet, year, month);
  var out = [];
  for (var i=0;i<ev.length;i++){
    var e = ev[i];
    var name = PLANET_NAME[planet];
    if (e.type === "ingress"){
      out.push({day:e.day, t:name+" переходит в знак "+A.SIGN_GEN[e.sign]+" - фон сферы меняется с этого дня"});
    } else if (e.type === "stationR"){
      out.push({day:e.day, t:name+" разворачивается назад. Старое всплывает, новое лучше не начинать"});
    } else {
      out.push({day:e.day, t:name+" снова идёт вперёд. С этого дня можно возвращаться к решениям"});
    }
  }
  return out;
}

function buildSphere(sp, signIdx, year, month, now){
  var mid = new Date(Date.UTC(year, month, 15, 12, 0, 0));
  var baseSign = A.signIndex(A.geoLongitude(sp.base, mid));
  var canonical = A.canonicalOffset(baseSign, signIdx);
  var raw = A.rawOffset(baseSign, signIdx);
  var hard = !!HARD[canonical];
  var side = (raw === canonical) ? 0 : 1;
  var seed = side + sp.key.length;

  var html = "";
  html += '<div class="sphere">';
  html += '<div class="sphere-top"><div class="sphere-ic">'+sp.icon+'</div><h3>'+sp.title+'</h3>';
  html += '<span class="tag '+(hard?"hard":"easy")+'">'+(hard?"требует внимания":"можно действовать")+'</span></div>';

  html += '<p>'+hl(pick(SCENARIO[canonical], seed)(PLANET_NAME[sp.base], A.SIGN_LOC[baseSign], A.SIGN_GEN[baseSign]))+'</p>';
  html += '<p>'+hl(hard ? sp.lead.hard : sp.lead.easy)+'</p>';

  // События планет ТОЛЬКО этой сферы: одна планета закреплена за одной сферой,
  // поэтому один и тот же переход не может появиться в двух сферах сразу.
  var ev = [];
  for (var pi=0; pi<sp.own.length; pi++) ev = ev.concat(planetEvents(sp.own[pi], year, month));

  var rows = [], taken = [];
  for (var k=0;k<ev.length;k++){
    if (taken.indexOf(ev[k].day) !== -1) continue;   // одна дата - одна строка
    taken.push(ev[k].day);
    rows.push({day:ev[k].day, t:ev[k].t});
  }

  // Лунные дни добавляем только если они не совпадают с уже занятой датой
  // и стоят от неё хотя бы в четырёх днях - иначе список читается как каша.
  var wantEasy = hard ? [2,4] : [4];
  var wantHard = hard ? [3] : [3,6];
  var dEasy = pickSpaced(A.moonAspectDays(year, month, signIdx, wantEasy, 31), 2, taken, sp.idx);
  var dHard = pickSpaced(A.moonAspectDays(year, month, signIdx, wantHard, 31), 2, taken, sp.idx+1);
  for (var i=0;i<dEasy.length;i++) rows.push({day:dEasy[i], t:sp.moonEasy[i]});
  for (var j=0;j<dHard.length;j++) rows.push({day:dHard[j], t:sp.moonHard[j]});
  rows.sort(function(a,b){ return a.day - b.day; });

  if (rows.length){
    html += '<table class="dtable"><tbody>';
    for (var m=0;m<rows.length;m++){
      html += '<tr><td class="d">'+rows[m].day+' '+MONTHS_GEN[month].slice(0,3)+'</td><td>'+rows[m].t+'</td></tr>';
    }
    html += '</tbody></table>';
  }

  // Дни для действия: сначала профильные (напряжённые для трудной сферы,
  // лёгкие для рабочей), если таких в месяце не выпало - берём вторые,
  // и только в крайнем случае опираемся на даты событий планет.
  var whenDays = (hard ? dHard : dEasy).slice();
  if (!whenDays.length) whenDays = (hard ? dEasy : dHard).slice();
  if (!whenDays.length) whenDays = rows.map(function(r){ return r.day; }).slice(0,2);
  whenDays.sort(function(a,b){ return a-b; });
  var whenText = whenDays.length
    ? listDays(whenDays, month) + " - ваши ключевые дни по этой сфере в месяце"
    : "Весь месяц, фон держится ровно";
  html += '<div class="todo"><b>Что с этим делать</b><p>'+(hard ? sp.todo.hard : sp.todo.easy)+'</p>';
  html += '<p class="when"><span>Когда</span>'+whenText+'</p></div>';
  html += '<div class="ask"><p class="ask-top">Это общее за месяц по вашему знаку:</p>';
  html += '<p class="ask-intro">а личные вопросы у вас свои, и звучат они примерно так</p>';
  html += '<i>'+(hard ? sp.ask.hard : sp.ask.easy)+'</i>';
  html += '<a class="ask-link" href="#horar-theory">Как получить на него ответ <span class="arw">&#8595;</span></a></div>';
  html += '</div>';
  return html;
}

function render(day, month1, year){
  var now = new Date();
  var y = now.getFullYear(), mo = now.getMonth();
  var signIdx = A.sunSignFromDate(day, month1);

  document.getElementById("signLine").textContent = A.SIGNS[signIdx] + ", " + MONTHS_NOM[mo];
  var mid = new Date(Date.UTC(y, mo, 15, 12, 0, 0));
  var sunSign = A.signIndex(A.geoLongitude("sun", mid));
  var sunCan = A.canonicalOffset(sunSign, signIdx);
  document.getElementById("metaLine").textContent = SUN_FLAVOR[sunCan];

  var out = "";
  for (var i=0;i<SPHERES.length;i++){ SPHERES[i].idx = i; out += buildSphere(SPHERES[i], signIdx, y, mo, now); }
  document.getElementById("spheres").innerHTML = out;

  var res = document.getElementById("result");
  res.classList.remove("hidden");
  res.scrollIntoView({behavior:"smooth", block:"start"});
}

/* ---------- селекты даты: день / месяц / год ---------- */
var selDay = document.getElementById("bdDay"),
    selMonth = document.getElementById("bdMonth"),
    selYear = document.getElementById("bdYear");

function fillSelect(el, from, to, labels, placeholder){
  var html = '<option value="" disabled selected>'+placeholder+'</option>';
  if (from <= to){ for (var i=from;i<=to;i++) html += '<option value="'+i+'">'+(labels?labels[i-1]:i)+'</option>'; }
  else { for (var j=from;j>=to;j--) html += '<option value="'+j+'">'+j+'</option>'; }
  el.innerHTML = html;
}
var thisYear = new Date().getFullYear();
fillSelect(selDay, 1, 31, null, "День");
fillSelect(selMonth, 1, 12, MONTHS_NOM, "Месяц");
fillSelect(selYear, thisYear, 1930, null, "Год");

/* ---------- таймер на цену: 24 часа с момента первого расчёта ---------- */
var KEY = "shakirova_prognoz_started";
function startTimer(){
  var started = null;
  try { started = localStorage.getItem(KEY); } catch(e){}
  var t0 = started ? parseInt(started, 10) : Date.now();
  if (!started){ try { localStorage.setItem(KEY, String(t0)); } catch(e){} }
  var box = document.getElementById("clock");
  if (!box) return;
  function tick(){
    var left = t0 + 24*3600*1000 - Date.now();
    if (left <= 0){ box.textContent = "время вышло, напишите - обсудим"; return; }
    var h = Math.floor(left/3600000), m = Math.floor(left%3600000/60000), sec = Math.floor(left%60000/1000);
    box.textContent = (h<10?"0":"")+h+":"+(m<10?"0":"")+m+":"+(sec<10?"0":"")+sec;
    setTimeout(tick, 1000);
  }
  tick();
}

document.getElementById("form").addEventListener("submit", function(e){
  e.preventDefault();
  var err = document.getElementById("err");
  var day = +selDay.value, month1 = +selMonth.value, year = +selYear.value;
  if (!day || !month1 || !year){ err.classList.add("on"); return; }
  var test = new Date(year, month1-1, day);
  if (test.getDate() !== day || test.getMonth() !== month1-1){ err.classList.add("on"); return; }
  err.classList.remove("on");
  render(day, month1, year);
  startTimer();
});
})();
