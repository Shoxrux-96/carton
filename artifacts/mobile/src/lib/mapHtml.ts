// Map HTML builder — separate .ts file to avoid JSX parsing issues
const SC = "script";

export function buildDeliveryMap(wLat: number, wLng: number): string {
  const openSc = "<" + SC + ">";
  const closeSc = "</" + SC + ">";
  const leafSc = "<" + SC + ' src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js">' + closeSc;

  return '<!DOCTYPE html><html><head>'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">'
    + '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>'
    + leafSc
    + '<style>*{margin:0;padding:0}html,body,#map{width:100%;height:100%}.ct{position:fixed;top:10px;right:10px;z-index:9999;display:flex;flex-direction:column;gap:5px}.bt{width:38px;height:38px;border-radius:10px;background:#fff;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer}.bt.on{background:#f97316}.dst{position:fixed;bottom:8px;left:8px;right:8px;background:rgba(255,255,255,0.95);border-radius:14px;padding:10px 14px;box-shadow:0 2px 12px rgba(0,0,0,0.1);font-family:-apple-system,system-ui;font-size:12px;display:none;z-index:9999}.dst.show{display:block}.dst b{font-size:14px;display:block;margin-bottom:3px}.dst .r{display:flex;justify-content:space-between;margin-top:3px;color:#57534e}.dst .r span{font-weight:700;color:#1c1917}.pu{animation:p 1.5s infinite}@keyframes p{0%,100%{transform:scale(1)}50%{transform:scale(1.2);opacity:.7}}</style>'
    + '</head><body><div id="map"></div>'
    + '<div class="ct"><button class="bt" id="bS" onclick="tS()">&#x1F6F0;</button><button class="bt on" id="bM" onclick="tM()">&#x1F5FA;</button><button class="bt" onclick="zA()">&#x1F3AF;</button></div>'
    + '<div class="dst" id="dst"></div>'
    + openSc
    + 'var m=L.map("map",{zoomControl:false,attributionControl:false}).setView([' + wLat + ',' + wLng + '],13);'
    + 'var sL=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");var satL=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}");sL.addTo(m);var cL="s";var aB=null;'
    + 'function tS(){if(cL!=="sat"){m.removeLayer(sL);satL.addTo(m);cL="sat";document.getElementById("bS").classList.add("on");document.getElementById("bM").classList.remove("on");}}'
    + 'function tM(){if(cL!=="s"){m.removeLayer(satL);sL.addTo(m);cL="s";document.getElementById("bM").classList.add("on");document.getElementById("bS").classList.remove("on");}}'
    + 'function zA(){if(aB)m.fitBounds(aB,{padding:[30,30],maxZoom:15});}'
    + 'L.marker([' + wLat + ',' + wLng + '],{icon:L.divIcon({className:"",html:\'<div style="width:34px;height:34px;background:linear-gradient(135deg,#f97316,#ea580c);border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(249,115,22,0.5);font-size:16px">&#x1F3ED;</div>\',iconSize:[34,34],iconAnchor:[17,17]})}).addTo(m).bindPopup("Korxona");'
    + 'var dM={},rL={},drM={},drA={};'
    + 'function sC(s){return s==="shipped"?"#3b82f6":s==="in_transit"?"#f59e0b":s==="delivered"?"#22c55e":"#9ca3af"}'
    + 'function clr(){Object.values(dM).forEach(function(x){m.removeLayer(x)});Object.values(rL).forEach(function(x){m.removeLayer(x)});Object.values(drM).forEach(function(x){m.removeLayer(x)});Object.keys(drA).forEach(function(k){clearInterval(drA[k])});dM={};rL={};drM={};drA={};}'
    + 'function dist(a,b){var R=6371;var dLat=(b[0]-a[0])*Math.PI/180;var dLng=(b[1]-a[1])*Math.PI/180;var x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}'
    + 'function aD(k,o,d,s){var p=s==="shipped"?0.15:s==="in_transit"?0.55:0.92;var sp=0.0015;var dir=1;drA[k]=setInterval(function(){p+=sp*dir;if(p>0.93||p<0.07)dir*=-1;if(drM[k])drM[k].setLatLng([o[0]+(d[0]-o[0])*p,o[1]+(d[1]-o[1])*p]);},60);}'
    + 'function uM(data){clr();var b=[[' + wLat + ',' + wLng + ']];data.forEach(function(d){var k="d_"+d.id;var dl=[d.lat,d.lng];var o=[' + wLat + ',' + wLng + '];b.push(dl);dM[k]=L.marker(dl,{icon:L.divIcon({className:"",html:\'<div style="width:28px;height:28px;background:\'+sC(d.status)+\';border:2.5px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px \'+sC(d.status)+\'60;font-size:12px">&#x1F4CD;</div>\',iconSize:[28,28],iconAnchor:[14,14]})}).addTo(m).on("click",function(){focusOrder(d,dl,o)});rL[k]=L.polyline([o,dl],{color:sC(d.status),weight:3,opacity:0.5,dashArray:"8,6"}).addTo(m);var ip=d.status==="shipped"?0.2:d.status==="in_transit"?0.55:0.9;drM[k]=L.marker([o[0]+(dl[0]-o[0])*ip,o[1]+(dl[1]-o[1])*ip],{icon:L.divIcon({className:"pu",html:\'<div style="width:26px;height:26px;background:linear-gradient(135deg,#f97316,#ea580c);border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(249,115,22,0.5);font-size:12px">&#x1F69B;</div>\',iconSize:[26,26],iconAnchor:[13,13]})}).addTo(m).on("click",function(){focusOrder(d,dl,o)});aD(k,o,dl,d.status);});if(b.length>1){aB=b;m.fitBounds(b,{padding:[40,40],maxZoom:15});}}'
    + 'function focusOrder(d,dl,o){var km=dist(o,dl).toFixed(1);var el=document.getElementById("dst");el.innerHTML="<b>#"+(d.orderCode||d.id)+" — "+d.clientName+"</b><div class=\\"r\\"><span>"+d.productName+" x "+d.quantity+"</span></div><div class=\\"r\\">Masofa: <span>"+km+" km</span></div><div class=\\"r\\">Tel: <span>"+(d.clientPhone||"-")+"</span></div>";el.className="dst show";m.fitBounds([o,dl],{padding:[50,80]});setTimeout(function(){el.className="dst";},6000);}'
    + 'function focusId(id){var data=window._data||[];var d=data.find(function(x){return x.id===id});if(d){var dl=[d.lat,d.lng];var o=[' + wLat + ',' + wLng + '];focusOrder(d,dl,o);}}'
    + 'function hMsg(e){try{var msg=JSON.parse(e.data);if(msg.type==="update"){window._data=msg.data;uM(msg.data);}if(msg.type==="focus")focusId(msg.id);}catch(er){}}'
    + 'window.addEventListener("message",hMsg);document.addEventListener("message",hMsg);'
    + closeSc + '</body></html>';
}
