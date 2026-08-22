import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/* =======================================================================
   TUNABLE CONSTANTS — adjust these to change the physical feel/realism.
   ======================================================================= */
var PAGE_W = 3.0;                 // world-unit page width (half of open spread)
var PAGE_H = PAGE_W * 1.4142;     // A4 portrait ratio
var PAGE_THICKNESS = 0.012;
var SEG_X = 40;                   // horizontal subdivisions on the turning page (curl axis)
var SEG_Y = 6;                    // vertical subdivisions
var MAX_CURL = 1.15;              // radians of local bend at the free edge, at peak (page midpoint)
var CURL_RADIUS = 0.62;           // world units — tightness of the roll
var DROOP = 0.10;                 // vertical sag toward the free edge at peak curl
var FLIP_MS = 700;                // programmatic (click/keyboard) flip duration
var OPEN_MS = 1300;               // cover-opening animation duration
var DRAG_COMMIT_THRESHOLD = 0.5;  // fraction of the sweep past which release completes the turn
var COVER_THICKNESS = 0.05;
var STACK_MAX_THICKNESS = 0.35;

var CREAM = 0xF5E4CF;
var CREAM_LIGHT = 0xFBF1E4;
var DENIM = 0x275CCC;
var DENIM_INK = 0x132559;

function easeInOutCubic(t){ return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }

/* =======================================================================
   Book3D — the whole engine, self-contained.
   ======================================================================= */
export function Book3D(opts){
  var container = opts.container;
  var onStateChange = opts.onStateChange || function(){};
  var onPageChange = opts.onPageChange || function(){};
  var LOG = window.PortfolioData.LOG;

  var scene, camera, renderer, clock;
  var textureLoader = new THREE.TextureLoader();
  var textureCache = {}; // url -> THREE.Texture

  var spineGroup, frontCoverPivot, frontCoverMesh, backCoverMesh;
  var leftPageMesh, rightPageMesh, leftStackMesh, rightStackMesh, groundMesh;
  var turnFrontMesh, turnBackMesh, turnGeoFront, turnGeoBack;

  var imageUrls = [];
  var spreads = [];       // [{left:idx|null, right:idx|null}]
  var spreadIdx = -1;     // -1 = closed
  var state = 'closed';   // closed | opening | open | turning | closing
  var isMobile = window.matchMedia('(max-width:768px)').matches;

  var drag = null;        // active drag info, or null
  var anim = null;        // active programmatic tween, or null

  /* ---------------- SETUP ---------------- */
  function setup(){
    scene = new THREE.Scene();
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(38, container.clientWidth/container.clientHeight, 0.1, 100);
    setCameraForState('closed', true);

    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Lighting — soft, matte, no specular hot spots (avoids the chrome look).
    var ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);

    var key = new THREE.DirectionalLight(0xfff3e0, 0.85);
    key.position.set(2.2, 3.5, 3.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024,1024);
    key.shadow.camera.left = -4; key.shadow.camera.right = 4;
    key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
    key.shadow.radius = 6;
    key.shadow.bias = -0.0015;
    scene.add(key);

    var fill = new THREE.DirectionalLight(0xdfe8ff, 0.35);
    fill.position.set(-2.5, 1.5, 2.0);
    scene.add(fill);

    // Ground receiver, catches the ambient contact shadow beneath the book.
    var groundGeo = new THREE.PlaneGeometry(20,20);
    var groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI/2;
    groundMesh.position.y = -PAGE_H/2 - 0.02;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    buildBookStructure();

    window.addEventListener('resize', onResize);
    attachInteraction();

    renderer.setAnimationLoop(tick);
  }

  function matteMaterial(color){
    return new THREE.MeshStandardMaterial({ color: color, roughness: 0.92, metalness: 0.0 });
  }

  function texturedMaterial(){
    return new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0.0, side: THREE.FrontSide });
  }

  /* ---------------- STATIC STRUCTURE ---------------- */
  function buildBookStructure(){
    spineGroup = new THREE.Group();
    scene.add(spineGroup);

    // Spine
    var spineGeo = new THREE.BoxGeometry(0.09, PAGE_H+0.05, 0.5);
    var spineMesh = new THREE.Mesh(spineGeo, matteMaterial(DENIM_INK));
    spineMesh.position.set(0,0,0.14);
    spineMesh.castShadow = true;
    scene.add(spineMesh);

    // Back cover (static backing)
    var backGeo = new THREE.BoxGeometry(PAGE_W, PAGE_H, COVER_THICKNESS);
    backCoverMesh = new THREE.Mesh(backGeo, matteMaterial(CREAM));
    backCoverMesh.position.set(0, 0, 0.28);
    backCoverMesh.castShadow = true;
    backCoverMesh.receiveShadow = true;
    scene.add(backCoverMesh);

    // Page stacks (thickness communicates "many pages", not individually modeled)
    leftStackMesh = new THREE.Mesh(new THREE.BoxGeometry(PAGE_W-0.02, PAGE_H-0.02, 0.02), matteMaterial(CREAM_LIGHT));
    leftStackMesh.receiveShadow = true; leftStackMesh.castShadow = true;
    rightStackMesh = new THREE.Mesh(new THREE.BoxGeometry(PAGE_W-0.02, PAGE_H-0.02, 0.02), matteMaterial(CREAM_LIGHT));
    rightStackMesh.receiveShadow = true; rightStackMesh.castShadow = true;
    scene.add(leftStackMesh, rightStackMesh);

    // Static resting pages (left/right), simple flat planes
    leftPageMesh = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), texturedMaterial());
    leftPageMesh.receiveShadow = true;
    rightPageMesh = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), texturedMaterial());
    rightPageMesh.receiveShadow = true;
    scene.add(leftPageMesh, rightPageMesh);

    // Front cover, hinged at the spine
    frontCoverPivot = new THREE.Group();
    frontCoverPivot.position.set(0,0,0.02);
    scene.add(frontCoverPivot);
    var coverGeo = new THREE.BoxGeometry(PAGE_W, PAGE_H, COVER_THICKNESS);
    coverGeo.translate(PAGE_W/2, 0, 0); // hinge edge at local x=0
    frontCoverMesh = new THREE.Mesh(coverGeo, texturedMaterial());
    frontCoverMesh.castShadow = true;
    frontCoverMesh.receiveShadow = true;
    frontCoverPivot.add(frontCoverMesh);

    // Turning page — double geometry (front/back), curl-deformable
    turnGeoFront = makeCurlGeometry(false);
    turnGeoBack = makeCurlGeometry(true);
    turnFrontMesh = new THREE.Mesh(turnGeoFront, texturedMaterial());
    turnFrontMesh.material.side = THREE.FrontSide;
    turnFrontMesh.castShadow = true;
    turnBackMesh = new THREE.Mesh(turnGeoBack, texturedMaterial());
    turnBackMesh.material.side = THREE.BackSide;
    turnBackMesh.castShadow = true;
    turnFrontMesh.visible = false;
    turnBackMesh.visible = false;
    scene.add(turnFrontMesh, turnBackMesh);

    layoutClosed();
  }

  function makeCurlGeometry(flipUV){
    var geo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, SEG_X, SEG_Y);
    geo.translate(PAGE_W/2, 0, 0); // local x in [0, PAGE_W], hinge at 0
    if(flipUV){
      var uv = geo.attributes.uv;
      for(var i=0;i<uv.count;i++){ uv.setX(i, 1 - uv.getX(i)); }
      uv.needsUpdate = true;
    }
    return geo;
  }

  /* ---------------- CURL DEFORMATION ---------------- */
  // theta in [0, PI]: 0 = resting flat on the right, PI = resting flat on the left.
  function applyCurl(theta){
    var bend = Math.sin(theta);
    var ct = Math.cos(theta), st = Math.sin(theta);
    [turnGeoFront, turnGeoBack].forEach(function(geo){
      var pos = geo.attributes.position;
      var base = geo.userData.basePos || (geo.userData.basePos = pos.array.slice());
      for(var i=0;i<pos.count;i++){
        var bx0 = base[i*3], by0 = base[i*3+1];
        var phi = bend * MAX_CURL * (bx0 / PAGE_W);
        // Local (unrotated) bent shape: flat when bend=0, curling toward the free edge when bend>0.
        var localX = bx0 - CURL_RADIUS * (1 - Math.cos(phi));
        var localZ = CURL_RADIUS * Math.sin(phi);
        // Rigid hinge rotation of the bent shape into world space.
        var wx = localX*ct - localZ*st;
        var wz = localX*st + localZ*ct;
        var wy = by0 - bend * DROOP * (bx0/PAGE_W);
        pos.setXYZ(i, wx, wy, wz);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    });
  }

  /* ---------------- LAYOUT HELPERS ---------------- */
  function layoutClosed(){
    frontCoverPivot.rotation.y = 0;
    frontCoverMesh.visible = true;
    backCoverMesh.visible = true;
    leftPageMesh.visible = false;
    rightPageMesh.visible = false;
    leftStackMesh.visible = false;
    rightStackMesh.visible = false;
    turnFrontMesh.visible = false;
    turnBackMesh.visible = false;
    groundMesh.position.x = 0;
  }

  function setStackThickness(){
    var total = spreads.length || 1;
    var leftCount = Math.max(0, spreadIdx);
    var rightCount = Math.max(0, spreads.length - spreadIdx - 1);
    var lt = Math.max(0.01, (leftCount/total) * STACK_MAX_THICKNESS);
    var rt = Math.max(0.01, (rightCount/total) * STACK_MAX_THICKNESS);
    leftStackMesh.scale.z = lt/0.02;
    rightStackMesh.scale.z = rt/0.02;
    leftStackMesh.position.set(-PAGE_W/2-0.03, 0, 0.16 - lt/2);
    rightStackMesh.position.set(PAGE_W/2+0.03, 0, 0.16 - rt/2);
  }

  function layoutOpenSpread(){
    frontCoverPivot.rotation.y = -Math.PI;
    frontCoverMesh.visible = false;
    backCoverMesh.visible = true;
    leftPageMesh.visible = true;
    rightPageMesh.visible = true;
    leftStackMesh.visible = true;
    rightStackMesh.visible = true;
    leftPageMesh.position.set(-PAGE_W/2, 0, 0.16);
    rightPageMesh.position.set(PAGE_W/2, 0, 0.16);
    setStackThickness();
    setPageTextures(leftPageMesh, spreads[spreadIdx] && spreads[spreadIdx].left);
    setPageTextures(rightPageMesh, spreads[spreadIdx] && spreads[spreadIdx].right);
  }

  /* ---------------- TEXTURES ---------------- */
  function loadTexture(url){
    if(textureCache[url]) return textureCache[url];
    var tex = textureLoader.load(url, function(t){
      t.colorSpace = THREE.SRGBColorSpace;
    }, undefined, function(err){
      console.error(LOG, 'Texture failed to load:', url, err);
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    textureCache[url] = tex;
    return tex;
  }

  function preloadNear(index){
    var lo = Math.max(0, index-2), hi = Math.min(imageUrls.length-1, index+2);
    for(var i=lo;i<=hi;i++) loadTexture(imageUrls[i]);
  }

  function setPageTextures(mesh, index){
    if(index==null){ mesh.visible = false; return; }
    mesh.visible = true;
    mesh.material.map = loadTexture(imageUrls[index]);
    mesh.material.needsUpdate = true;
  }

  /* ---------------- SPREADS / PAGINATION ---------------- */
  function buildSpreads(){
    var inner = imageUrls.slice(1, imageUrls.length-1); // exclude front/back covers
    var out = [];
    if(isMobile){
      inner.forEach(function(_,i){ out.push({ left:null, right:i+1 }); });
    } else {
      for(var i=0;i<inner.length;i+=2){
        out.push({ left:i+1, right:(i+1<inner.length? i+2:null) });
      }
    }
    return out;
  }

  /* ---------------- CAMERA ---------------- */
  function setCameraForState(s, instant){
    var pos, look;
    if(s==='closed'){
      pos = new THREE.Vector3(1.1, 0.4, 5.6);
      look = new THREE.Vector3(0,0,0.1);
    } else {
      var lookX = isMobile ? PAGE_W/2 : 0;
      var z = isMobile ? 4.2 : 5.0;
      pos = new THREE.Vector3(lookX, 0.15, z);
      look = new THREE.Vector3(lookX, 0, 0.15);
    }
    if(instant){
      camera.position.copy(pos);
      camera.lookAt(look);
      camera.userData.look = look;
    } else {
      tweenCamera(pos, look, 900);
    }
  }
  function tweenCamera(targetPos, targetLook, ms){
    var startPos = camera.position.clone();
    var startLook = camera.userData.look? camera.userData.look.clone() : targetLook.clone();
    var t0 = performance.now();
    function step(){
      var t = Math.min((performance.now()-t0)/ms, 1);
      var e = easeInOutCubic(t);
      camera.position.lerpVectors(startPos, targetPos, e);
      var look = new THREE.Vector3().lerpVectors(startLook, targetLook, e);
      camera.lookAt(look);
      camera.userData.look = look;
      if(t<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------------- STATE TRANSITIONS ---------------- */
  function setState(s){
    state = s;
    onStateChange(s);
  }

  function openBook(){
    if(state!=='closed' || imageUrls.length===0) return;
    setState('opening');
    setCameraForState('open', false);
    var t0 = performance.now();
    function step(){
      var t = Math.min((performance.now()-t0)/OPEN_MS, 1);
      frontCoverPivot.rotation.y = -Math.PI * easeInOutCubic(t);
      if(t < 1){ requestAnimationFrame(step); }
      else {
        spreadIdx = 0;
        if(spreads.length===0){
          leftPageMesh.visible = false; rightPageMesh.visible = false;
          leftStackMesh.visible = false; rightStackMesh.visible = false;
          setState('open');
          onPageChange();
          return;
        }
        layoutOpenSpread();
        preloadNear(spreads[0].right || 1);
        setState('open');
        onPageChange();
      }
    }
    requestAnimationFrame(step);
  }

  function closeBook(){
    if(state!=='open' || spreadIdx!==0) return;
    setState('closing');
    setCameraForState('closed', false);
    leftPageMesh.visible = false; rightPageMesh.visible = false;
    leftStackMesh.visible = false; rightStackMesh.visible = false;
    frontCoverMesh.visible = true;
    var t0 = performance.now();
    function step(){
      var t = Math.min((performance.now()-t0)/OPEN_MS, 1);
      frontCoverPivot.rotation.y = -Math.PI * (1-easeInOutCubic(t));
      if(t < 1){ requestAnimationFrame(step); }
      else {
        spreadIdx = -1;
        layoutClosed();
        setState('closed');
        onPageChange();
      }
    }
    requestAnimationFrame(step);
  }

  function beginTurn(direction){
    if(state!=='open') { if(state==='closed' && direction==='fwd') openBook(); return; }
    if(direction==='fwd' && spreadIdx>=spreads.length-1) return;
    if(direction==='back' && spreadIdx<=0){ closeBook(); return; }
    return direction;
  }

  function startTurningVisuals(direction){
    var fromSp = spreads[spreadIdx];
    var toIdx = direction==='fwd'? spreadIdx+1 : spreadIdx-1;
    var toSp = spreads[toIdx];

    // "vacated" = the page currently occupying the position being turned away from.
    // "revealed" = the page that will occupy the position being turned to.
    // Desktop distinguishes left/right slots; mobile only ever has one slot (.right).
    var vacatedIdx  = (direction==='fwd' || isMobile) ? fromSp.right : fromSp.left;
    var revealedIdx = (direction==='fwd' && !isMobile) ? toSp.left : toSp.right;

    // Geometric fact (independent of direction): the FRONT face is visible at theta=0,
    // the BACK face is visible at theta=π. Forward starts at theta=0, backward ends there.
    var frontIdx = direction==='fwd' ? vacatedIdx : revealedIdx;
    var backIdx  = direction==='fwd' ? revealedIdx : vacatedIdx;

    setPageTextures(turnFrontMesh, frontIdx);
    setPageTextures(turnBackMesh, backIdx);
    turnFrontMesh.visible = true;
    turnBackMesh.visible = true;
    preloadNear(revealedIdx==null? vacatedIdx : revealedIdx);

    // Hide the static page this mesh now covers; the other side (desktop only) stays untouched.
    var hideLeft = (direction==='back' && !isMobile);
    if(hideLeft) leftPageMesh.visible = false;
    else rightPageMesh.visible = false;

    return { toIdx: toIdx, fromSp: fromSp, toSp: toSp };
  }

  function finishTurn(direction, toIdx){
    spreadIdx = toIdx;
    turnFrontMesh.visible = false;
    turnBackMesh.visible = false;
    layoutOpenSpread();
    setState('open');
    onPageChange();
    preloadNear((spreads[spreadIdx].right!=null? spreads[spreadIdx].right : spreads[spreadIdx].left));
  }

  function cancelTurn(direction){
    turnFrontMesh.visible = false;
    turnBackMesh.visible = false;
    layoutOpenSpread();
    setState('open');
  }

  function programmaticTurn(direction){
    if(state==='turning' || anim) return;
    var d = beginTurn(direction);
    if(!d) return;
    setState('turning');
    var ctx = startTurningVisuals(direction);
    var thetaStart = direction==='fwd'? 0 : Math.PI;
    var thetaEnd = direction==='fwd'? Math.PI : 0;
    var t0 = performance.now();
    anim = { direction: direction };
    function step(){
      var t = Math.min((performance.now()-t0)/FLIP_MS, 1);
      var theta = thetaStart + (thetaEnd-thetaStart)*easeInOutCubic(t);
      applyCurl(theta);
      if(t<1){ requestAnimationFrame(step); }
      else { anim=null; finishTurn(direction, ctx.toIdx); }
    }
    requestAnimationFrame(step);
  }

  /* ---------------- POINTER / DRAG INTERACTION ---------------- */
  function cornerZone(clientX, clientY){
    var rect = renderer.domElement.getBoundingClientRect();
    var nx = (clientX-rect.left)/rect.width;   // 0..1 left->right
    var ny = (clientY-rect.top)/rect.height;   // 0..1 top->bottom
    if(ny < 0.45) return null;                 // corner interaction = lower portion of the page
    if(nx > 0.62) return 'fwd';
    if(nx < 0.38) return 'back';
    return null;
  }

  function attachInteraction(){
    var dom = renderer.domElement;

    dom.addEventListener('pointerdown', function(e){
      if(state==='closed'){ openBook(); return; }
      if(state!=='open') return;
      var zone = cornerZone(e.clientX, e.clientY);
      if(!zone) return;
      var d = beginTurn(zone);
      if(!d) return;
      setState('turning');
      var ctx = startTurningVisuals(zone);
      drag = {
        direction: zone,
        startX: e.clientX,
        thetaStart: zone==='fwd'? 0 : Math.PI,
        thetaEnd: zone==='fwd'? Math.PI : 0,
        toIdx: ctx.toIdx,
        progress: 0
      };
      applyCurl(drag.thetaStart);
      dom.setPointerCapture && dom.setPointerCapture(e.pointerId);
    });

    dom.addEventListener('pointermove', function(e){
      if(!drag) return;
      var rect = dom.getBoundingClientRect();
      var dx = e.clientX - drag.startX;
      var raw = drag.direction==='fwd'? -dx : dx;
      var p = Math.max(0, Math.min(raw/(rect.width*0.42), 1));
      drag.progress = p;
      var theta = drag.thetaStart + (drag.thetaEnd-drag.thetaStart)*p;
      applyCurl(theta);
    });

    function endDrag(){
      if(!drag) return;
      var d = drag; drag = null;
      var complete = d.progress >= DRAG_COMMIT_THRESHOLD;
      var thetaFrom = d.thetaStart + (d.thetaEnd-d.thetaStart)*d.progress;
      var thetaTo = complete? d.thetaEnd : d.thetaStart;
      var t0 = performance.now();
      var ms = 260;
      function step(){
        var t = Math.min((performance.now()-t0)/ms, 1);
        var theta = thetaFrom + (thetaTo-thetaFrom)*easeInOutCubic(t);
        applyCurl(theta);
        if(t<1){ requestAnimationFrame(step); }
        else {
          if(complete) finishTurn(d.direction, d.toIdx);
          else cancelTurn(d.direction);
        }
      }
      requestAnimationFrame(step);
    }
    dom.addEventListener('pointerup', endDrag);
    dom.addEventListener('pointercancel', endDrag);

    window.addEventListener('keydown', function(e){
      if(e.key==='ArrowRight') programmaticTurn('fwd');
      else if(e.key==='ArrowLeft') programmaticTurn('back');
    });
  }

  /* ---------------- RESIZE / RENDER LOOP ---------------- */
  function onResize(){
    isMobile = window.matchMedia('(max-width:768px)').matches;
    camera.aspect = container.clientWidth/container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  function tick(){
    renderer.render(scene, camera);
  }

  /* ---------------- PUBLIC API ---------------- */
  function load(urls){
    imageUrls = urls;
    spreads = buildSpreads();
    loadTexture(imageUrls[0]);
    loadTexture(imageUrls[imageUrls.length-1]);
    frontCoverMesh.material.map = loadTexture(imageUrls[0]);
    frontCoverMesh.material.needsUpdate = true;
    backCoverMesh.material.map = loadTexture(imageUrls[imageUrls.length-1]);
    backCoverMesh.material.needsUpdate = true;
    preloadNear(1);
  }

  function next(){ programmaticTurn('fwd'); }
  function prev(){ programmaticTurn('back'); }
  function goToCover(){
    if(state==='open' && spreadIdx===0){ closeBook(); }
  }
  function currentLabel(){
    if(state==='closed'||state==='opening'){ return 'Cover'; }
    if(spreadIdx<0) return 'Cover';
    var sp = spreads[spreadIdx];
    var l = sp.left, r = sp.right;
    var total = imageUrls.length;
    if(l!=null && r!=null) return (l+1)+'\u2013'+(r+1)+' / '+total;
    return ((l!=null?l:r)+1)+' / '+total;
  }

  setup();

  return { load:load, next:next, prev:prev, goToCover:goToCover, currentLabel:currentLabel, getState:function(){ return state; } };
}
