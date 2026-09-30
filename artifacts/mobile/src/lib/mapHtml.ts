const SC = "script";

// Haydovchi uchun to'liq ekran xarita: zoom tugmalari,
// ko'cha / sun'iy yo'ldosh ko'rinish tugmalari, ombor + mening lokatsiyam
export function buildDriverMap(wLat: number, wLng: number): string {
  const openSc = "<" + SC + ">";
  const closeSc = "</" + SC + ">";

  return '<!DOCTYPE html><html><head>'
    + '<meta charset="utf-8"/>'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>'
    + '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>'
    + '<' + SC + ' src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"/></' + SC + '>'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'html,body,#map{width:100%;height:100%;background:#e8e8e8}'
    + '</style>'
    + '</head><body>'
    + '<div id="map"></div>'
    + openSc
    + 'var wLat=' + wLat + ',wLng=' + wLng + ';'
    + 'var m=L.map("map",{zoomControl:false,attributionControl:false}).setView([wLat,wLng],13);'
    + 'var stL=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19});'
    + 'var saL=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:18});'
    + 'stL.addTo(m);'
    + 'function zIn(){m.zoomIn();}'
    + 'function zOut(){m.zoomOut();}'
    + 'var myLat=wLat,myLng=wLng,myMk=null;'
    + 'function zLoc(){if(myMk){m.setView([myLat,myLng],16);}}'
    + 'function setCls(id,on){var e=document.getElementById(id);if(!e)return;if(on){e.classList.add("on");}else{e.classList.remove("on");}}'
    + 'var satOn=false;'
    + 'function tS(){if(satOn)return;m.removeLayer(stL);saL.addTo(m);satOn=true;setCls("bSat",true);setCls("bStreet",false);}'
    + 'function tM(){if(!satOn)return;m.removeLayer(saL);stL.addTo(m);satOn=false;setCls("bStreet",true);setCls("bSat",false);}'
    // Route / destination layers (jonli yo'llar)
    + 'var routeLayers={},destMk=null;'
    + 'function drawRoute(id,pts,color,dash,w){if(routeLayers[id]){m.removeLayer(routeLayers[id]);delete routeLayers[id];}if(!pts||pts.length<2)return;routeLayers[id]=L.polyline(pts,{color:color,weight:w||5,opacity:0.95,dashArray:dash||null}).addTo(m);}'
    + 'function clearRoute(id){if(routeLayers[id]){m.removeLayer(routeLayers[id]);delete routeLayers[id];}}'
    + 'function setDest(lat,lng,label){if(destMk){m.removeLayer(destMk);destMk=null;}destMk=L.marker([lat,lng],{icon:PIN_IC,zIndexOffset:900}).addTo(m).bindPopup("<b>"+(label||"Buyurtma manzili")+"</b>");}'
    + 'function fitAll(){var pts=[];for(var k in routeLayers){routeLayers[k].getLatLngs().forEach(function(p){pts.push([p.lat,p.lng]);});}if(destMk)pts.push(destMk.getLatLng());pts.push([wLat,wLng]);if(myMk)pts.push(myMk.getLatLng());if(pts.length>1){m.fitBounds(pts,{padding:[45,45]});}}'
    + 'var whIcon=L.divIcon({className:"",html:"<div style=\\"width:38px;height:38px;background:linear-gradient(135deg,#f97316,#ea580c);border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(249,115,22,0.5);font-size:17px\\">&#x1F3ED;</div>",iconSize:[38,38],iconAnchor:[19,19]});'
    + 'L.marker([wLat,wLng],{icon:whIcon}).addTo(m).bindPopup("<b>Shovot Carton</b><br/>Ombor");'
    + 'function setMy(lat,lng){myLat=lat;myLng=lng;if(!myMk){myMk=L.marker([lat,lng],{icon:L.divIcon({className:"",html:"<div style=\\"width:22px;height:22px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px #3b82f6,0 2px 8px rgba(59,130,246,0.4);\\"></div>",iconSize:[22,22],iconAnchor:[11,11]})}).addTo(m).bindPopup("<b>&#x1F4CD; Mening lokatsiyam</b><br/>"+lat.toFixed(6)+", "+lng.toFixed(6));}else{myMk.setLatLng([lat,lng]);}}'
    + 'var PIN_IC=L.divIcon({className:"",html:\'<svg width="30" height="42" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))"><path d="M16 1C7.7 1 1 7.7 1 16c0 10.4 15 27 15 27s15-16.6 15-27C31 7.7 24.3 1 16 1z" fill="#ef4444" stroke="#ffffff" stroke-width="2.5"/><circle cx="16" cy="15.5" r="5.5" fill="#ffffff"/></svg>\',iconSize:[30,42],iconAnchor:[15,42]});var pickMk=null;function setPick(lat,lng){if(pickMk){pickMk.setLatLng([lat,lng]);}else{pickMk=L.marker([lat,lng],{icon:PIN_IC,zIndexOffset:1000}).addTo(m);}}m.on("click",function(e){setPick(e.latlng.lat,e.latlng.lng);});'
    + 'function onMsg(e){try{var msg=JSON.parse(e.data);if(msg.type==="myLoc"){setMy(msg.lat,msg.lng);}else if(msg.type==="flyTo"){m.setView([msg.lat,msg.lng],msg.z||15);}else if(msg.type==="sat"){tS();}else if(msg.type==="street"){tM();}else if(msg.type==="zoomIn"){zIn();}else if(msg.type==="zoomOut"){zOut();}else if(msg.type==="locate"){zLoc();}else if(msg.type==="drawRoute"){drawRoute(msg.id,msg.points,msg.color,msg.dash,msg.weight);}else if(msg.type==="clearRoute"){clearRoute(msg.id);}else if(msg.type==="setDest"){setDest(msg.lat,msg.lng,msg.label);}else if(msg.type==="fit"){fitAll();}}catch(er){}}'
    + 'window.addEventListener("message",onMsg);'
    + 'document.addEventListener("message",onMsg);'
    + closeSc
    + '</body></html>';
}

export function buildDeliveryMap(wLat: number, wLng: number): string {
  const openSc = "<" + SC + ">";
  const closeSc = "</" + SC + ">";

  var html = '<!DOCTYPE html><html><head>'
    + '<meta charset="utf-8"/>'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>'
    + '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>'
    + '<' + SC + ' src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"/></' + SC + '>'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'html,body,#map{width:100%;height:100%;background:#e8e8e8}'
    + '.ct{position:fixed;top:10px;right:10px;z-index:9999;display:flex;flex-direction:column;gap:5px}'
    + '.bt{width:38px;height:38px;border-radius:10px;background:#fff;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer}'
    + '.bt.on{background:#f97316;color:#fff}'
    + '.info{position:fixed;bottom:10px;left:10px;right:10px;background:rgba(255,255,255,0.95);border-radius:12px;padding:10px 14px;box-shadow:0 2px 12px rgba(0,0,0,0.1);font-family:system-ui;font-size:12px;display:none;z-index:9999}'
    + '.info.show{display:block}'
    + '.info b{font-size:14px;display:block;margin-bottom:4px}'
    + '.info .r{display:flex;justify-content:space-between;margin-top:3px;color:#57534e}'
    + '.info .r span{font-weight:700;color:#1c1917}'
    + '</style>'
    + '</head><body>'
    + '<div id="map"></div>'
    + '<div class="ct">'
    + '<button class="bt on" id="bM" onclick="tM()">&#x1F5FA;</button>'
    + '<button class="bt" id="bS" onclick="tS()">&#x1F6F0;</button>'
    + '</div>'
    + '<div class="info" id="info"></div>'
    + openSc
    + 'var wLat=' + wLat + ',wLng=' + wLng + ';'
    + 'var m=L.map("map",{zoomControl:false,attributionControl:false}).setView([wLat,wLng],13);'
    + 'var stL=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19});'
    + 'var saL=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:18});'
    + 'stL.addTo(m);'
    + 'L.control.zoom({position:"topleft"}).addTo(m);'
    + 'var satOn=false;'
    + 'function tS(){if(satOn)return;m.removeLayer(stL);saL.addTo(m);satOn=true;document.getElementById("bS").classList.add("on");document.getElementById("bM").classList.remove("on");}'
    + 'function tM(){if(!satOn)return;m.removeLayer(saL);stL.addTo(m);satOn=false;document.getElementById("bM").classList.add("on");document.getElementById("bS").classList.remove("on");}'
    // Warehouse marker
    + 'var whIcon=L.divIcon({className:"",html:"<div style=\\"width:36px;height:36px;background:linear-gradient(135deg,#f97316,#ea580c);border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(249,115,22,0.5);font-size:16px\\">&#x1F3ED;</div>",iconSize:[36,36],iconAnchor:[18,18]});'
    + 'L.marker([wLat,wLng],{icon:whIcon}).addTo(m).bindPopup("<b>Shovot Carton</b><br/>Ombor");'
    // My location marker
    + 'var myMk=null;'
    + 'function setMy(lat,lng){if(!myMk){myMk=L.marker([lat,lng],{icon:L.divIcon({className:"",html:"<div style=\\"width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px #3b82f6,0 2px 8px rgba(59,130,246,0.4);\\"></div>",iconSize:[20,20],iconAnchor:[10,10]})}).addTo(m).bindPopup("<b>📍 Mening lokatsiyam</b><br/>"+lat.toFixed(6)+", "+lng.toFixed(6));}else{myMk.setLatLng([lat,lng]);}}'
    // Driver markers
    + 'var drMk={};'
    + 'function updDrivers(list){for(var k in drMk){m.removeLayer(drMk[k]);}drMk={};if(!list)return;list.forEach(function(d){var ic=L.divIcon({className:"",html:"<div style=\\"width:36px;height:36px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(59,130,246,0.5);font-size:16px\\">&#x1F69B;</div>",iconSize:[36,36],iconAnchor:[18,18]});drMk["d_"+d.id]=L.marker([d.lat,d.lng],{icon:ic}).addTo(m).bindPopup("<b>"+(d.name||("Haydovchi #"+d.id))+"</b><br/>"+(d.phone||"-")+"<br/>"+d.lat.toFixed(4)+", "+d.lng.toFixed(4));});}'
    // Delivery markers + routes + animated progress
    + 'var delMk={},rLn={},progMk={},_routes=[],_allData=[],hl=null,hl2=null;'
    + 'function sC(s){return s==="delivered"?"#22c55e":s==="in_transit"?"#f59e0b":s==="shipped"?"#3b82f6":"#9ca3af";}'
    + 'function fmtSum(n){return (Number(n)||0).toLocaleString("uz-UZ")+" so\'m";}'
    + 'function clr(){for(var k in delMk){m.removeLayer(delMk[k]);}for(var k2 in rLn){m.removeLayer(rLn[k2]);}for(var k3 in progMk){m.removeLayer(progMk[k3]);}if(hl){m.removeLayer(hl);hl=null;}if(hl2){m.removeLayer(hl2);hl2=null;}delMk={};rLn={};progMk={};_routes=[];}'
    + 'function showInfo(d){var el=document.getElementById("info");el.innerHTML="<b>#"+(d.orderCode||d.id)+" - "+d.clientName+"</b><div class=\\"r\\"><span>"+(d.clientPhone||"-")+"</span><span>"+fmtSum(d.totalSum)+"</span></div><div class=\\"r\\"><span>"+(d.status==="delivered"?"✅ Yetkazilgan":d.status==="in_transit"?"🚚 Yo\'lda":"⏳ Kutilmoqda")+"</span></div>";el.className="info show";}'
    + 'function updD(data){clr();var bd=[[wLat,wLng]];data.forEach(function(d){if(d.lat==null||d.lng==null)return;var pos=[d.lat,d.lng];var o=(d.from&&d.from.length===2)?d.from:[wLat,wLng];bd.push(pos);var col=sC(d.status);var ic=L.divIcon({className:"",html:"<div style=\\"width:30px;height:30px;background:"+col+";border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px "+col+"60;font-size:13px\\">&#x1F4CD;</div>",iconSize:[30,30],iconAnchor:[15,15]});var mk=L.marker(pos,{icon:ic}).addTo(m).bindPopup("<b>"+(d.orderCode||d.id)+" - "+d.clientName+"</b><br/>"+(d.clientPhone||"-")+"<br/>"+fmtSum(d.totalSum));mk.on("click",function(){showInfo(d);});delMk["d_"+d.id]=mk;rLn["r_"+d.id]=L.polyline([o,pos],{color:col,weight:3,opacity:0.5,dashArray:"8,6"}).addTo(m);progMk["p_"+d.id]=L.circleMarker(o,{color:"#3b82f6",fillColor:"#60a5fa",fillOpacity:0.9,weight:2,radius:5}).addTo(m);_routes.push({a:o,b:pos,mk:progMk["p_"+d.id]});});if(bd.length>1){m.fitBounds(bd,{padding:[40,40]});}}'
    + 'var rp=0.1;setInterval(function(){rp=rp>0.9?0.1:rp+0.04;_routes.forEach(function(r){r.mk.setLatLng([r.a[0]+(r.b[0]-r.a[0])*rp,r.a[1]+(r.b[1]-r.a[1])*rp]);});},500);'
    + 'function focusId(id){for(var i=0;i<_allData.length;i++){var d=_allData[i];if(d.id===id){m.setView([d.lat,d.lng],15);showInfo(d);if(hl){m.removeLayer(hl);}if(hl2){m.removeLayer(hl2);}var o=(d.from&&d.from.length===2)?d.from:[wLat,wLng];hl=L.polyline([o,[d.lat,d.lng]],{color:"#ef4444",weight:8,opacity:0.15}).addTo(m);hl2=L.polyline([o,[d.lat,d.lng]],{color:"#ef4444",weight:4,opacity:0.8}).addTo(m);return;}}}'
    + 'var PIN_IC=L.divIcon({className:"",html:\'<svg width="30" height="42" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))"><path d="M16 1C7.7 1 1 7.7 1 16c0 10.4 15 27 15 27s15-16.6 15-27C31 7.7 24.3 1 16 1z" fill="#ef4444" stroke="#ffffff" stroke-width="2.5"/><circle cx="16" cy="15.5" r="5.5" fill="#ffffff"/></svg>\',iconSize:[30,42],iconAnchor:[15,42]});var pickMk=null;function setPick(lat,lng){if(pickMk){pickMk.setLatLng([lat,lng]);}else{pickMk=L.marker([lat,lng],{icon:PIN_IC,zIndexOffset:1000}).addTo(m);}}m.on("click",function(e){setPick(e.latlng.lat,e.latlng.lng);});'
    + 'function onMsg(e){try{var msg=JSON.parse(e.data);if(msg.type==="update"){_allData=msg.data||[];updD(_allData);}if(msg.type==="drivers"){updDrivers(msg.data);}if(msg.type==="myLoc"){setMy(msg.lat,msg.lng);}if(msg.type==="focus"){focusId(msg.id);}if(msg.type==="flyTo"){m.setView([msg.lat,msg.lng],15);}if(msg.type==="sat"){tS();}if(msg.type==="street"){tM();}if(msg.type==="clearInfo"){document.getElementById("info").className="info";}}catch(er){}}'
    + 'window.addEventListener("message",onMsg);'
    + 'document.addEventListener("message",onMsg);'
    + closeSc
    + '</body></html>';

  return html;
}
