// Compiles a dart2wasm-generated main module from `source` which can then
// instantiatable via the `instantiate` method.
//
// `source` needs to be a `Response` object (or promise thereof) e.g. created
// via the `fetch()` JS API.
export async function compileStreaming(source) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(
      await WebAssembly.compileStreaming(source, builtins), builtins);
}

// Compiles a dart2wasm-generated wasm modules from `bytes` which is then
// instantiatable via the `instantiate` method.
export async function compile(bytes) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(await WebAssembly.compile(bytes, builtins), builtins);
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export async function instantiate(modulePromise, importObjectPromise) {
  var moduleOrCompiledApp = await modulePromise;
  if (!(moduleOrCompiledApp instanceof CompiledApp)) {
    moduleOrCompiledApp = new CompiledApp(moduleOrCompiledApp);
  }
  const instantiatedApp = await moduleOrCompiledApp.instantiate(await importObjectPromise);
  return instantiatedApp.instantiatedModule;
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export const invoke = (moduleInstance, ...args) => {
  moduleInstance.exports.$invokeMain(args);
}

class CompiledApp {
  constructor(module, builtins) {
    this.module = module;
    this.builtins = builtins;
  }

  // The second argument is an options object containing:
  // `loadDeferredModules` is a JS function that takes an array of module names
  //   matching wasm files produced by the dart2wasm compiler. It also takes a
  //   callback that should be invoked for each loaded module with 2 arugments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDeferredId` is a JS function that takes load ID produced by the
  //   compiler when the `load-ids` option is passed. Each load ID maps to one
  //   or more wasm files as specified in the emitted JSON file. It also takes a
  //   callback that should be invoked for each loaded module with 2 arugments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDynamicModule` is a JS function that takes two string names matching,
  //   in order, a wasm file produced by the dart2wasm compiler during dynamic
  //   module compilation and a corresponding js file produced by the same
  //   compilation. It also takes a callback that should be invoked with the
  //   loaded module in a format supported by `WebAssembly.compile` or
  //   `WebAssembly.compileStreaming` and the result of using the JS 'import'
  //   API on the js file path. It should return a Promise that resolves when
  //   all the modules have been loaded and the callback promises have resolved.
  async instantiate(additionalImports,
      {loadDeferredModules, loadDynamicModule, loadDeferredId} = {}) {
    let dartInstance;

    // Prints to the console
    function printToConsole(value) {
      if (typeof dartPrint == "function") {
        dartPrint(value);
        return;
      }
      if (typeof console == "object" && typeof console.log != "undefined") {
        console.log(value);
        return;
      }
      if (typeof print == "function") {
        print(value);
        return;
      }

      throw "Unable to print message: " + value;
    }

    // A special symbol attached to functions that wrap Dart functions.
    const jsWrappedDartFunctionSymbol = Symbol("JSWrappedDartFunction");

    function finalizeWrapper(dartFunction, wrapped) {
      wrapped.dartFunction = dartFunction;
      wrapped[jsWrappedDartFunctionSymbol] = true;
      return wrapped;
    }

    // Imports
    const dart2wasm = {
            _1: (decoder, codeUnits) => decoder.decode(codeUnits),
      _2: () => new TextDecoder("utf-8", {fatal: true}),
      _3: () => new TextDecoder("utf-8", {fatal: false}),
      _4: (s) => +s,
      _5: x0 => new Uint8Array(x0),
      _6: (x0,x1,x2) => x0.set(x1,x2),
      _7: (x0,x1) => x0.transferFromImageBitmap(x1),
      _8: x0 => x0.arrayBuffer(),
      _9: (x0,x1,x2) => x0.slice(x1,x2),
      _10: (x0,x1) => x0.decode(x1),
      _11: (x0,x1) => x0.segment(x1),
      _12: () => new TextDecoder(),
      _13: (x0,x1) => x0.get(x1),
      _14: x0 => x0.buffer,
      _15: x0 => x0.wasmMemory,
      _16: () => globalThis.window._flutter_skwasmInstance,
      _17: x0 => x0.rasterStartMilliseconds,
      _18: x0 => x0.rasterEndMilliseconds,
      _19: x0 => x0.imageBitmaps,
      _135: (x0,x1) => x0.appendChild(x1),
      _166: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _167: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      _168: (x0,x1) => new OffscreenCanvas(x0,x1),
      _169: x0 => x0.remove(),
      _170: (x0,x1) => x0.append(x1),
      _172: x0 => x0.unlock(),
      _173: x0 => x0.getReader(),
      _174: (x0,x1) => x0.item(x1),
      _175: x0 => x0.next(),
      _176: x0 => x0.now(),
      _177: (x0,x1) => x0.revokeObjectURL(x1),
      _178: x0 => x0.close(),
      _179: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      _180: x0 => new window.ImageDecoder(x0),
      _181: (x0,x1) => ({frameIndex: x0,completeFramesOnly: x1}),
      _182: (x0,x1) => x0.decode(x1),
      _183: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._183(f,arguments.length,x0) }),
      _184: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _186: (x0,x1) => x0.getModifierState(x1),
      _187: x0 => x0.preventDefault(),
      _188: x0 => x0.stopPropagation(),
      _189: (x0,x1) => x0.removeProperty(x1),
      _190: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._190(f,arguments.length,x0) }),
      _191: x0 => new window.FinalizationRegistry(x0),
      _192: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      _194: (x0,x1) => x0.unregister(x1),
      _195: (x0,x1) => x0.prepend(x1),
      _196: x0 => new Intl.Locale(x0),
      _197: (x0,x1) => x0.observe(x1),
      _198: x0 => x0.disconnect(),
      _199: (x0,x1) => x0.getAttribute(x1),
      _200: (x0,x1) => x0.contains(x1),
      _201: (x0,x1) => x0.querySelector(x1),
      _202: (x0,x1) => x0.matchMedia(x1),
      _203: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._203(f,arguments.length,x0) }),
      _204: (x0,x1,x2) => x0.call(x1,x2),
      _205: x0 => x0.blur(),
      _206: x0 => x0.hasFocus(),
      _207: (x0,x1) => x0.removeAttribute(x1),
      _208: (x0,x1,x2) => x0.insertBefore(x1,x2),
      _209: (x0,x1) => x0.hasAttribute(x1),
      _210: (x0,x1) => x0.getModifierState(x1),
      _211: (x0,x1) => x0.createTextNode(x1),
      _212: x0 => x0.getBoundingClientRect(),
      _213: (x0,x1) => x0.replaceWith(x1),
      _214: (x0,x1) => x0.contains(x1),
      _215: (x0,x1) => x0.closest(x1),
      _216: () => new Array(),
      _653: x0 => new Uint8Array(x0),
      _656: () => globalThis.window.flutterConfiguration,
      _658: x0 => x0.assetBase,
      _663: x0 => x0.canvasKitMaximumSurfaces,
      _664: x0 => x0.debugShowSemanticsNodes,
      _665: x0 => x0.hostElement,
      _666: x0 => x0.multiViewEnabled,
      _667: x0 => x0.nonce,
      _669: x0 => x0.fontFallbackBaseUrl,
      _679: x0 => x0.console,
      _680: x0 => x0.devicePixelRatio,
      _681: x0 => x0.document,
      _682: x0 => x0.history,
      _683: x0 => x0.innerHeight,
      _684: x0 => x0.innerWidth,
      _685: x0 => x0.location,
      _686: x0 => x0.navigator,
      _687: x0 => x0.visualViewport,
      _688: x0 => x0.performance,
      _689: x0 => x0.parent,
      _691: x0 => x0.URL,
      _693: (x0,x1) => x0.getComputedStyle(x1),
      _694: x0 => x0.screen,
      _695: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._695(f,arguments.length,x0) }),
      _696: (x0,x1) => x0.requestAnimationFrame(x1),
      _700: (x0,x1) => x0.warn(x1),
      _702: (x0,x1) => x0.debug(x1),
      _703: x0 => globalThis.parseFloat(x0),
      _704: () => globalThis.window,
      _705: () => globalThis.Intl,
      _706: () => globalThis.Symbol,
      _707: (x0,x1,x2,x3,x4) => globalThis.createImageBitmap(x0,x1,x2,x3,x4),
      _709: x0 => x0.clipboard,
      _710: x0 => x0.maxTouchPoints,
      _711: x0 => x0.vendor,
      _712: x0 => x0.language,
      _713: x0 => x0.platform,
      _714: x0 => x0.userAgent,
      _715: (x0,x1) => x0.vibrate(x1),
      _716: x0 => x0.languages,
      _717: x0 => x0.documentElement,
      _718: (x0,x1) => x0.querySelector(x1),
      _719: (x0,x1) => x0.querySelectorAll(x1),
      _721: (x0,x1) => x0.createElement(x1),
      _724: (x0,x1) => x0.createEvent(x1),
      _725: x0 => x0.activeElement,
      _728: x0 => x0.head,
      _729: x0 => x0.body,
      _731: (x0,x1) => { x0.title = x1 },
      _734: x0 => x0.visibilityState,
      _735: () => globalThis.document,
      _736: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._736(f,arguments.length,x0) }),
      _737: (x0,x1) => x0.dispatchEvent(x1),
      _745: x0 => x0.target,
      _747: x0 => x0.timeStamp,
      _748: x0 => x0.type,
      _750: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      _756: x0 => x0.baseURI,
      _757: x0 => x0.firstChild,
      _761: x0 => x0.parentElement,
      _763: (x0,x1) => { x0.textContent = x1 },
      _764: x0 => x0.parentNode,
      _765: x0 => x0.nextSibling,
      _766: (x0,x1) => x0.removeChild(x1),
      _767: x0 => x0.isConnected,
      _772: x0 => x0.firstElementChild,
      _775: x0 => x0.clientHeight,
      _776: x0 => x0.clientWidth,
      _777: x0 => x0.offsetHeight,
      _778: x0 => x0.offsetWidth,
      _779: x0 => x0.id,
      _780: (x0,x1) => { x0.id = x1 },
      _783: (x0,x1) => { x0.spellcheck = x1 },
      _784: x0 => x0.tagName,
      _785: x0 => x0.style,
      _787: (x0,x1) => x0.querySelectorAll(x1),
      _788: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _789: x0 => x0.tabIndex,
      _790: (x0,x1) => { x0.tabIndex = x1 },
      _791: (x0,x1) => x0.focus(x1),
      _792: x0 => x0.scrollTop,
      _793: (x0,x1) => { x0.scrollTop = x1 },
      _794: (x0,x1) => { x0.scrollLeft = x1 },
      _795: x0 => x0.scrollLeft,
      _796: x0 => x0.classList,
      _797: (x0,x1) => x0.scrollIntoView(x1),
      _800: (x0,x1) => { x0.className = x1 },
      _802: (x0,x1) => x0.getElementsByClassName(x1),
      _803: x0 => x0.click(),
      _804: (x0,x1) => x0.attachShadow(x1),
      _807: x0 => x0.computedStyleMap(),
      _808: (x0,x1) => x0.get(x1),
      _814: (x0,x1) => x0.getPropertyValue(x1),
      _815: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      _816: x0 => x0.offsetLeft,
      _817: x0 => x0.offsetTop,
      _818: x0 => x0.offsetParent,
      _820: (x0,x1) => { x0.name = x1 },
      _821: x0 => x0.content,
      _822: (x0,x1) => { x0.content = x1 },
      _826: (x0,x1) => { x0.src = x1 },
      _827: x0 => x0.naturalWidth,
      _828: x0 => x0.naturalHeight,
      _832: (x0,x1) => { x0.crossOrigin = x1 },
      _834: (x0,x1) => { x0.decoding = x1 },
      _835: x0 => x0.decode(),
      _840: (x0,x1) => { x0.nonce = x1 },
      _845: (x0,x1) => { x0.width = x1 },
      _847: (x0,x1) => { x0.height = x1 },
      _850: (x0,x1) => x0.getContext(x1),
      _918: x0 => x0.width,
      _919: x0 => x0.height,
      _921: (x0,x1) => x0.fetch(x1),
      _922: x0 => x0.status,
      _923: x0 => x0.headers,
      _924: x0 => x0.body,
      _925: x0 => x0.arrayBuffer(),
      _927: x0 => x0.text(),
      _928: x0 => x0.read(),
      _929: x0 => x0.value,
      _930: x0 => x0.done,
      _937: x0 => x0.name,
      _938: x0 => x0.x,
      _939: x0 => x0.y,
      _942: x0 => x0.top,
      _943: x0 => x0.right,
      _944: x0 => x0.bottom,
      _945: x0 => x0.left,
      _955: x0 => x0.height,
      _956: x0 => x0.width,
      _957: x0 => x0.scale,
      _958: (x0,x1) => { x0.value = x1 },
      _961: (x0,x1) => { x0.placeholder = x1 },
      _963: (x0,x1) => { x0.name = x1 },
      _964: x0 => x0.selectionDirection,
      _965: x0 => x0.selectionStart,
      _966: x0 => x0.selectionEnd,
      _969: x0 => x0.value,
      _971: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _972: x0 => x0.readText(),
      _973: (x0,x1) => x0.writeText(x1),
      _975: x0 => x0.altKey,
      _976: x0 => x0.code,
      _977: x0 => x0.ctrlKey,
      _978: x0 => x0.key,
      _979: x0 => x0.keyCode,
      _980: x0 => x0.location,
      _981: x0 => x0.metaKey,
      _982: x0 => x0.repeat,
      _983: x0 => x0.shiftKey,
      _984: x0 => x0.isComposing,
      _986: x0 => x0.state,
      _987: (x0,x1) => x0.go(x1),
      _989: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      _990: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      _991: x0 => x0.pathname,
      _992: x0 => x0.search,
      _993: x0 => x0.hash,
      _997: x0 => x0.state,
      _1000: (x0,x1) => x0.createObjectURL(x1),
      _1002: x0 => new Blob(x0),
      _1012: x0 => x0.matches,
      _1016: x0 => x0.matches,
      _1020: x0 => x0.relatedTarget,
      _1022: x0 => x0.clientX,
      _1023: x0 => x0.clientY,
      _1024: x0 => x0.offsetX,
      _1025: x0 => x0.offsetY,
      _1028: x0 => x0.button,
      _1029: x0 => x0.buttons,
      _1030: x0 => x0.ctrlKey,
      _1034: x0 => x0.pointerId,
      _1035: x0 => x0.pointerType,
      _1036: x0 => x0.pressure,
      _1037: x0 => x0.tiltX,
      _1038: x0 => x0.tiltY,
      _1039: x0 => x0.getCoalescedEvents(),
      _1042: x0 => x0.deltaX,
      _1043: x0 => x0.deltaY,
      _1044: x0 => x0.wheelDeltaX,
      _1045: x0 => x0.wheelDeltaY,
      _1046: x0 => x0.deltaMode,
      _1053: x0 => x0.changedTouches,
      _1056: x0 => x0.clientX,
      _1057: x0 => x0.clientY,
      _1060: x0 => x0.data,
      _1063: (x0,x1) => { x0.disabled = x1 },
      _1065: (x0,x1) => { x0.type = x1 },
      _1066: (x0,x1) => { x0.max = x1 },
      _1067: (x0,x1) => { x0.min = x1 },
      _1068: x0 => x0.value,
      _1069: (x0,x1) => { x0.value = x1 },
      _1070: x0 => x0.disabled,
      _1071: (x0,x1) => { x0.disabled = x1 },
      _1073: (x0,x1) => { x0.placeholder = x1 },
      _1075: (x0,x1) => { x0.name = x1 },
      _1076: (x0,x1) => { x0.autocomplete = x1 },
      _1078: x0 => x0.selectionDirection,
      _1079: x0 => x0.selectionStart,
      _1081: x0 => x0.selectionEnd,
      _1084: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _1085: (x0,x1) => x0.add(x1),
      _1087: (x0,x1) => { x0.noValidate = x1 },
      _1088: (x0,x1) => { x0.method = x1 },
      _1089: (x0,x1) => { x0.action = x1 },
      _1095: (x0,x1) => x0.getContext(x1),
      _1097: x0 => x0.convertToBlob(),
      _1114: x0 => x0.orientation,
      _1115: x0 => x0.width,
      _1116: x0 => x0.height,
      _1117: (x0,x1) => x0.lock(x1),
      _1136: x0 => new ResizeObserver(x0),
      _1139: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1139(f,arguments.length,x0,x1) }),
      _1147: x0 => x0.length,
      _1148: x0 => x0.iterator,
      _1149: x0 => x0.Segmenter,
      _1150: x0 => x0.v8BreakIterator,
      _1151: (x0,x1) => new Intl.Segmenter(x0,x1),
      _1154: x0 => x0.language,
      _1155: x0 => x0.script,
      _1156: x0 => x0.region,
      _1174: x0 => x0.done,
      _1175: x0 => x0.value,
      _1176: x0 => x0.index,
      _1180: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      _1181: (x0,x1) => x0.adoptText(x1),
      _1182: x0 => x0.first(),
      _1183: x0 => x0.next(),
      _1184: x0 => x0.current(),
      _1186: () => globalThis.window.FinalizationRegistry,
      _1197: x0 => x0.hostElement,
      _1198: x0 => x0.viewConstraints,
      _1201: x0 => x0.maxHeight,
      _1202: x0 => x0.maxWidth,
      _1203: x0 => x0.minHeight,
      _1204: x0 => x0.minWidth,
      _1205: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1205(f,arguments.length,x0) }),
      _1206: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1206(f,arguments.length,x0) }),
      _1207: (x0,x1) => ({addView: x0,removeView: x1}),
      _1210: x0 => x0.loader,
      _1211: () => globalThis._flutter,
      _1212: (x0,x1) => x0.didCreateEngineInitializer(x1),
      _1213: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1213(f,arguments.length,x0) }),
      _1214: (module,f) => finalizeWrapper(f, function() { return module.exports._1214(f,arguments.length) }),
      _1215: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      _1218: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1218(f,arguments.length,x0) }),
      _1219: x0 => ({runApp: x0}),
      _1221: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1221(f,arguments.length,x0,x1) }),
      _1222: x0 => new Promise(x0),
      _1223: x0 => x0.length,
      _1224: () => globalThis.window.ImageDecoder,
      _1225: x0 => x0.tracks,
      _1227: x0 => x0.completed,
      _1229: x0 => x0.image,
      _1235: x0 => x0.displayWidth,
      _1236: x0 => x0.displayHeight,
      _1237: x0 => x0.duration,
      _1240: x0 => x0.ready,
      _1241: x0 => x0.selectedTrack,
      _1242: x0 => x0.repetitionCount,
      _1243: x0 => x0.frameCount,
      _1287: (x0,x1) => x0.createElement(x1),
      _1288: (x0,x1) => x0.querySelector(x1),
      _1289: (x0,x1) => x0.appendChild(x1),
      _1290: x0 => ({type: x0}),
      _1291: (x0,x1) => new Blob(x0,x1),
      _1292: x0 => globalThis.URL.createObjectURL(x0),
      _1294: (x0,x1,x2,x3) => x0.sendCommand(x1,x2,x3),
      _1295: () => globalThis.PdfiumWasmCommunicator,
      _1297: x0 => { globalThis.pdfiumWasmWorkerUrl = x0 },
      _1298: (x0,x1) => x0.writeText(x1),
      _1299: x0 => x0.preventDefault(),
      _1300: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1300(f,arguments.length,x0) }),
      _1301: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _1302: x0 => x0.requestFullscreen(),
      _1303: x0 => x0.exitFullscreen(),
      _1304: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1304(f,arguments.length,x0) }),
      _1305: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1305(f,arguments.length,x0) }),
      _1306: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _1307: (x0,x1,x2,x3) => x0.canUseHlsJs(x1,x2,x3),
      _1308: (x0,x1,x2,x3) => x0.attach(x1,x2,x3),
      _1309: x0 => x0.load(),
      _1310: x0 => x0.play(),
      _1311: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      _1312: x0 => x0.pause(),
      _1313: (x0,x1) => x0.removeAttribute(x1),
      _1314: (x0,x1) => x0.destroy(x1),
      _1315: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1315(f,arguments.length,x0) }),
      _1316: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1316(f,arguments.length,x0) }),
      _1317: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1317(f,arguments.length,x0) }),
      _1318: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1318(f,arguments.length,x0) }),
      _1319: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1319(f,arguments.length,x0) }),
      _1320: x0 => x0.mute(),
      _1321: x0 => x0.unMute(),
      _1322: x0 => x0.disconnect(),
      _1323: x0 => x0.pauseVideo(),
      _1324: x0 => x0.destroy(),
      _1325: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1325(f,arguments.length,x0,x1) }),
      _1326: x0 => new ResizeObserver(x0),
      _1327: (x0,x1) => x0.observe(x1),
      _1328: (x0,x1) => new YT.Player(x0,x1),
      _1329: x0 => x0.getIframe(),
      _1330: x0 => x0.playVideo(),
      _1331: (x0,x1) => x0.loadModule(x1),
      _1332: (x0,x1) => x0.unloadModule(x1),
      _1333: (x0,x1) => x0.end(x1),
      _1334: (x0,x1,x2,x3) => x0.canUseHlsJs(x1,x2,x3),
      _1335: (x0,x1,x2,x3) => x0.attach(x1,x2,x3),
      _1336: (x0,x1) => x0.destroy(x1),
      _1337: x0 => x0.remove(),
      _1338: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1338(f,arguments.length,x0) }),
      _1339: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._1339(f,arguments.length,x0,x1,x2) }),
      _1340: (x0,x1) => x0.append(x1),
      _1343: (x0,x1) => x0.getResponseHeader(x1),
      _1366: (x0,x1) => x0.item(x1),
      _1369: (x0,x1) => { x0.csp = x1 },
      _1370: x0 => x0.csp,
      _1371: (x0,x1) => x0.getCookieExpirationDate(x1),
      _1372: () => globalThis.window.navigator.userAgent,
      _1373: x0 => x0.createRange(),
      _1374: (x0,x1) => x0.selectNode(x1),
      _1375: x0 => x0.getSelection(),
      _1376: x0 => x0.removeAllRanges(),
      _1377: (x0,x1) => x0.addRange(x1),
      _1378: (x0,x1) => x0.createElement(x1),
      _1379: (x0,x1) => x0.append(x1),
      _1380: (x0,x1,x2) => x0.insertRule(x1,x2),
      _1381: (x0,x1) => x0.add(x1),
      _1382: x0 => x0.preventDefault(),
      _1383: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1383(f,arguments.length,x0) }),
      _1384: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _1385: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1385(f,arguments.length,x0) }),
      _1388: (x0,x1) => x0.get(x1),
      _1389: x0 => x0.text(),
      _1406: () => new webkitSpeechRecognition(),
      _1407: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1407(f,arguments.length,x0) }),
      _1408: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1408(f,arguments.length,x0) }),
      _1409: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1409(f,arguments.length,x0) }),
      _1410: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1410(f,arguments.length,x0) }),
      _1411: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1411(f,arguments.length,x0) }),
      _1412: x0 => x0.stop(),
      _1413: x0 => x0.abort(),
      _1414: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1414(f,arguments.length,x0) }),
      _1415: x0 => x0.start(),
      _1416: (x0,x1) => x0.item(x1),
      _1417: (x0,x1) => x0.item(x1),
      _1420: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _1421: (x0,x1,x2,x3) => x0.removeEventListener(x1,x2,x3),
      _1426: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _1427: x0 => x0.decode(),
      _1428: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _1429: (x0,x1,x2) => x0.setRequestHeader(x1,x2),
      _1430: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1430(f,arguments.length,x0) }),
      _1431: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1431(f,arguments.length,x0) }),
      _1432: x0 => x0.send(),
      _1433: () => new XMLHttpRequest(),
      _1434: x0 => globalThis.Wakelock.toggle(x0),
      _1436: x0 => x0.getGamepads(),
      _1437: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1437(f,arguments.length,x0) }),
      _1438: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1438(f,arguments.length,x0) }),
      _1439: (x0,x1) => x0.getItem(x1),
      _1440: (x0,x1) => x0.removeItem(x1),
      _1441: (x0,x1,x2) => x0.setItem(x1,x2),
      _1471: (x0,x1) => x0.item(x1),
      _1472: () => new FileReader(),
      _1473: (x0,x1) => x0.readAsDataURL(x1),
      _1474: (x0,x1) => x0.readAsArrayBuffer(x1),
      _1475: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1475(f,arguments.length,x0) }),
      _1476: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1476(f,arguments.length,x0) }),
      _1477: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1477(f,arguments.length,x0) }),
      _1478: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1478(f,arguments.length,x0) }),
      _1479: (x0,x1) => x0.removeChild(x1),
      _1480: x0 => x0.click(),
      _1552: (x0,x1) => x0.key(x1),
      _1562: Date.now,
      _1564: s => new Date(s * 1000).getTimezoneOffset() * 60,
      _1565: s => {
        if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(s)) {
          return NaN;
        }
        return parseFloat(s);
      },
      _1566: () => typeof dartUseDateNowForTicks !== "undefined",
      _1567: () => 1000 * performance.now(),
      _1568: () => Date.now(),
      _1569: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      _1570: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      _1571: () => new WeakMap(),
      _1572: (map, o) => map.get(o),
      _1573: (map, o, v) => map.set(o, v),
      _1574: x0 => new WeakRef(x0),
      _1575: x0 => x0.deref(),
      _1576: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1576(f,arguments.length,x0) }),
      _1577: x0 => new FinalizationRegistry(x0),
      _1578: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      _1579: (x0,x1,x2) => x0.register(x1,x2),
      _1580: (x0,x1) => x0.unregister(x1),
      _1582: () => globalThis.WeakRef,
      _1583: () => globalThis.FinalizationRegistry,
      _1585: x0 => x0.call(),
      _1586: s => JSON.stringify(s),
      _1587: s => printToConsole(s),
      _1588: o => {
        if (o === null || o === undefined) return 0;
        if (typeof(o) === 'string') return 1;
        return 2;
      },
      _1589: (o, p, r) => o.replaceAll(p, () => r),
      _1590: (o, p, r) => o.replace(p, () => r),
      _1591: Function.prototype.call.bind(String.prototype.toLowerCase),
      _1592: s => s.toUpperCase(),
      _1593: s => s.trim(),
      _1594: s => s.trimLeft(),
      _1595: s => s.trimRight(),
      _1596: (string, times) => string.repeat(times),
      _1597: Function.prototype.call.bind(String.prototype.indexOf),
      _1598: (s, p, i) => s.lastIndexOf(p, i),
      _1599: (string, token) => string.split(token),
      _1600: Object.is,
      _1604: (o, t) => typeof o === t,
      _1605: (o, c) => o instanceof c,
      _1606: o => Object.keys(o),
      _1608: (o) => {
        const typeofValue = typeof o;
        return (typeofValue === 'object') ||
            typeofValue === 'function';
      },
      _1609: (o,s,v) => o[s] = v,
      _1610: (o, a) => o + a,
      _1620: (o, a) => o == a,
      _1639: (x0,x1) => x0.call(x1),
      _1660: x0 => new Array(x0),
      _1662: x0 => x0.length,
      _1664: (x0,x1) => x0[x1],
      _1665: (x0,x1,x2) => { x0[x1] = x2 },
      _1668: (x0,x1,x2) => new DataView(x0,x1,x2),
      _1670: x0 => new Int8Array(x0),
      _1671: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      _1673: x0 => new Uint8ClampedArray(x0),
      _1675: x0 => new Int16Array(x0),
      _1677: x0 => new Uint16Array(x0),
      _1679: x0 => new Int32Array(x0),
      _1681: x0 => new Uint32Array(x0),
      _1683: x0 => new Float32Array(x0),
      _1685: x0 => new Float64Array(x0),
      _1705: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1705(f,arguments.length,x0,x1) }),
      _1708: () => Symbol("jsBoxedDartObjectProperty"),
      _1709: x0 => x0.random(),
      _1710: (x0,x1) => x0.getRandomValues(x1),
      _1711: () => globalThis.crypto,
      _1712: () => globalThis.Math,
      _1714: () => globalThis.performance,
      _1715: () => globalThis.JSON,
      _1716: x0 => x0.measure,
      _1717: x0 => x0.mark,
      _1718: x0 => x0.clearMeasures,
      _1719: x0 => x0.clearMarks,
      _1720: (x0,x1,x2,x3) => x0.measure(x1,x2,x3),
      _1721: (x0,x1,x2) => x0.mark(x1,x2),
      _1722: x0 => x0.clearMeasures(),
      _1723: x0 => x0.clearMarks(),
      _1724: (x0,x1) => x0.parse(x1),
      _1725: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      _1726: (handle) => clearTimeout(handle),
      _1727: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      _1728: (handle) => clearInterval(handle),
      _1729: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      _1730: () => Date.now(),
      _1731: () => new Error().stack,
      _1732: (exn) => {
        let stackString = exn.toString();
        let frames = stackString.split('\n');
        let drop = 4;
        if (frames[0].startsWith('Error')) {
            drop += 1;
        }
        return frames.slice(drop).join('\n');
      },
      _1733: (s, m) => {
        try {
          return new RegExp(s, m);
        } catch (e) {
          return String(e);
        }
      },
      _1734: (x0,x1) => x0.exec(x1),
      _1735: (x0,x1) => x0.test(x1),
      _1736: x0 => x0.pop(),
      _1738: o => o === undefined,
      _1740: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      _1742: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      _1743: o => o instanceof RegExp,
      _1744: (l, r) => l === r,
      _1745: o => o,
      _1746: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'number') return 1;
        return 2;
      },
      _1747: o => o,
      _1748: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'boolean') return 1;
        return 2;
      },
      _1749: o => o,
      _1750: b => !!b,
      _1751: o => o.length,
      _1753: (o, i) => o[i],
      _1754: f => f.dartFunction,
      _1755: () => ({}),
      _1756: () => [],
      _1758: () => globalThis,
      _1759: (constructor, args) => {
        const factoryFunction = constructor.bind.apply(
            constructor, [null, ...args]);
        return new factoryFunction();
      },
      _1760: (o, p) => p in o,
      _1761: (o, p) => o[p],
      _1762: (o, p, v) => o[p] = v,
      _1763: (o, m, a) => o[m].apply(o, a),
      _1765: o => String(o),
      _1766: (p, s, f) => p.then(s, (e) => f(e, e === undefined)),
      _1767: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1767(f,arguments.length,x0) }),
      _1768: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1768(f,arguments.length,x0,x1) }),
      _1769: o => {
        if (o === undefined) return 1;
        var type = typeof o;
        if (type === 'boolean') return 2;
        if (type === 'number') return 3;
        if (type === 'string') return 4;
        if (o instanceof Array) return 5;
        if (ArrayBuffer.isView(o)) {
          if (o instanceof Int8Array) return 6;
          if (o instanceof Uint8Array) return 7;
          if (o instanceof Uint8ClampedArray) return 8;
          if (o instanceof Int16Array) return 9;
          if (o instanceof Uint16Array) return 10;
          if (o instanceof Int32Array) return 11;
          if (o instanceof Uint32Array) return 12;
          if (o instanceof Float32Array) return 13;
          if (o instanceof Float64Array) return 14;
          if (o instanceof DataView) return 15;
        }
        if (o instanceof ArrayBuffer) return 16;
        // Feature check for `SharedArrayBuffer` before doing a type-check.
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
            return 17;
        }
        if (o instanceof Promise) return 18;
        return 19;
      },
      _1770: o => [o],
      _1771: (o0, o1) => [o0, o1],
      _1772: (o0, o1, o2) => [o0, o1, o2],
      _1773: (o0, o1, o2, o3) => [o0, o1, o2, o3],
      _1774: (exn) => {
        if (exn instanceof Error) {
          return exn.stack;
        } else {
          return null;
        }
      },
      _1775: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI8ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1776: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI8ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1777: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI16ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1778: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI16ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1779: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1780: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1781: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1782: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1783: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF64ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1784: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1785: x0 => new ArrayBuffer(x0),
      _1786: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      _1787: x0 => x0.input,
      _1788: x0 => x0.index,
      _1789: x0 => x0.groups,
      _1790: x0 => x0.flags,
      _1791: x0 => x0.multiline,
      _1792: x0 => x0.ignoreCase,
      _1793: x0 => x0.unicode,
      _1794: x0 => x0.dotAll,
      _1795: (x0,x1) => { x0.lastIndex = x1 },
      _1796: (o, p) => p in o,
      _1797: (o, p) => o[p],
      _1798: (o, p, v) => o[p] = v,
      _1799: (o, p) => delete o[p],
      _1800: x0 => x0.exports,
      _1801: (x0,x1) => globalThis.WebAssembly.instantiateStreaming(x0,x1),
      _1802: x0 => x0.instance,
      _1804: x0 => new WebAssembly.Memory(x0),
      _1805: x0 => x0.buffer,
      _1808: x0 => x0.arrayBuffer(),
      _1810: x0 => x0.sqlite3_initialize,
      _1812: (x0,x1,x2,x3,x4) => x0.sqlite3_open_v2(x1,x2,x3,x4),
      _1813: (x0,x1) => x0.sqlite3_close_v2(x1),
      _1814: (x0,x1,x2) => x0.sqlite3_extended_result_codes(x1,x2),
      _1815: (x0,x1) => x0.sqlite3_extended_errcode(x1),
      _1816: (x0,x1) => x0.sqlite3_errmsg(x1),
      _1817: (x0,x1) => x0.sqlite3_errstr(x1),
      _1818: x0 => x0.sqlite3_error_offset,
      _1822: (x0,x1) => x0.sqlite3_last_insert_rowid(x1),
      _1823: (x0,x1) => x0.sqlite3_changes(x1),
      _1824: (x0,x1,x2,x3,x4,x5) => x0.sqlite3_exec(x1,x2,x3,x4,x5),
      _1827: (x0,x1,x2,x3,x4,x5,x6) => x0.sqlite3_prepare_v3(x1,x2,x3,x4,x5,x6),
      _1828: (x0,x1) => x0.sqlite3_finalize(x1),
      _1829: (x0,x1) => x0.sqlite3_step(x1),
      _1830: (x0,x1) => x0.sqlite3_reset(x1),
      _1831: (x0,x1) => x0.sqlite3_stmt_isexplain(x1),
      _1833: (x0,x1) => x0.sqlite3_column_count(x1),
      _1834: (x0,x1) => x0.sqlite3_bind_parameter_count(x1),
      _1836: (x0,x1,x2) => x0.sqlite3_column_name(x1,x2),
      _1837: (x0,x1,x2,x3,x4,x5) => x0.sqlite3_bind_blob64(x1,x2,x3,x4,x5),
      _1838: (x0,x1,x2,x3) => x0.sqlite3_bind_double(x1,x2,x3),
      _1839: (x0,x1,x2,x3) => x0.sqlite3_bind_int64(x1,x2,x3),
      _1840: (x0,x1,x2) => x0.sqlite3_bind_null(x1,x2),
      _1841: (x0,x1,x2,x3,x4,x5) => x0.sqlite3_bind_text(x1,x2,x3,x4,x5),
      _1842: (x0,x1,x2) => x0.sqlite3_column_blob(x1,x2),
      _1843: (x0,x1,x2) => x0.sqlite3_column_double(x1,x2),
      _1844: (x0,x1,x2) => x0.sqlite3_column_int64(x1,x2),
      _1845: (x0,x1,x2) => x0.sqlite3_column_text(x1,x2),
      _1846: (x0,x1,x2) => x0.sqlite3_column_bytes(x1,x2),
      _1847: (x0,x1,x2) => x0.sqlite3_column_type(x1,x2),
      _1848: (x0,x1) => x0.sqlite3_value_blob(x1),
      _1849: (x0,x1) => x0.sqlite3_value_double(x1),
      _1850: (x0,x1) => x0.sqlite3_value_type(x1),
      _1851: (x0,x1) => x0.sqlite3_value_int64(x1),
      _1852: (x0,x1) => x0.sqlite3_value_text(x1),
      _1853: (x0,x1) => x0.sqlite3_value_bytes(x1),
      _1856: (x0,x1) => x0.sqlite3_user_data(x1),
      _1857: (x0,x1,x2,x3,x4) => x0.sqlite3_result_blob64(x1,x2,x3,x4),
      _1858: (x0,x1,x2) => x0.sqlite3_result_double(x1,x2),
      _1859: (x0,x1,x2,x3) => x0.sqlite3_result_error(x1,x2,x3),
      _1860: (x0,x1,x2) => x0.sqlite3_result_int64(x1,x2),
      _1861: (x0,x1) => x0.sqlite3_result_null(x1),
      _1862: (x0,x1,x2,x3,x4) => x0.sqlite3_result_text(x1,x2,x3,x4),
      _1863: x0 => x0.sqlite3_result_subtype,
      _1882: (x0,x1) => x0.dart_sqlite3_malloc(x1),
      _1883: (x0,x1) => x0.dart_sqlite3_free(x1),
      _1884: (x0,x1,x2,x3) => x0.dart_sqlite3_register_vfs(x1,x2,x3),
      _1885: (x0,x1,x2,x3,x4,x5) => x0.dart_sqlite3_create_scalar_function(x1,x2,x3,x4,x5),
      _1888: x0 => x0.dart_sqlite3_updates,
      _1889: x0 => x0.dart_sqlite3_commits,
      _1890: x0 => x0.dart_sqlite3_rollbacks,
      _1894: x0 => ({initial: x0}),
      _1895: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1895(f,arguments.length,x0) }),
      _1896: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3,x4) { return module.exports._1896(f,arguments.length,x0,x1,x2,x3,x4) }),
      _1897: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._1897(f,arguments.length,x0,x1,x2) }),
      _1898: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return module.exports._1898(f,arguments.length,x0,x1,x2,x3) }),
      _1899: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return module.exports._1899(f,arguments.length,x0,x1,x2,x3) }),
      _1900: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._1900(f,arguments.length,x0,x1,x2) }),
      _1901: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1901(f,arguments.length,x0,x1) }),
      _1902: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1902(f,arguments.length,x0,x1) }),
      _1903: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1903(f,arguments.length,x0) }),
      _1904: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1904(f,arguments.length,x0) }),
      _1905: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return module.exports._1905(f,arguments.length,x0,x1,x2,x3) }),
      _1906: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return module.exports._1906(f,arguments.length,x0,x1,x2,x3) }),
      _1907: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1907(f,arguments.length,x0,x1) }),
      _1908: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1908(f,arguments.length,x0,x1) }),
      _1909: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1909(f,arguments.length,x0,x1) }),
      _1910: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1910(f,arguments.length,x0,x1) }),
      _1911: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1911(f,arguments.length,x0,x1) }),
      _1912: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1912(f,arguments.length,x0,x1) }),
      _1913: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._1913(f,arguments.length,x0,x1,x2) }),
      _1914: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._1914(f,arguments.length,x0,x1,x2) }),
      _1915: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._1915(f,arguments.length,x0,x1,x2) }),
      _1916: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1916(f,arguments.length,x0) }),
      _1917: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1917(f,arguments.length,x0) }),
      _1918: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1918(f,arguments.length,x0) }),
      _1919: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3,x4) { return module.exports._1919(f,arguments.length,x0,x1,x2,x3,x4) }),
      _1920: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3,x4) { return module.exports._1920(f,arguments.length,x0,x1,x2,x3,x4) }),
      _1921: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1921(f,arguments.length,x0) }),
      _1922: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1922(f,arguments.length,x0) }),
      _1923: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1923(f,arguments.length,x0,x1) }),
      _1924: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1924(f,arguments.length,x0,x1) }),
      _1925: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._1925(f,arguments.length,x0,x1,x2) }),
      _1927: (x0,x1,x2,x3) => x0.call(x1,x2,x3),
      _1932: x0 => new URL(x0),
      _1933: (x0,x1) => new URL(x0,x1),
      _1934: (x0,x1) => globalThis.fetch(x0,x1),
      _1935: (x0,x1,x2) => x0.postMessage(x1,x2),
      _1936: (x0,x1,x2) => x0.postMessage(x1,x2),
      _1938: (x0,x1) => ({i: x0,p: x1}),
      _1939: (x0,x1) => ({c: x0,r: x1}),
      _1940: x0 => x0.i,
      _1941: x0 => x0.p,
      _1942: x0 => x0.c,
      _1943: x0 => x0.r,
      _1944: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1944(f,arguments.length,x0) }),
      _1945: (x0,x1) => x0.postMessage(x1),
      _1946: x0 => x0.close(),
      _1948: x0 => new Worker(x0),
      _1950: x0 => x0.getDirectory(),
      _1951: x0 => ({create: x0}),
      _1952: (x0,x1,x2) => x0.getFileHandle(x1,x2),
      _1953: x0 => x0.createSyncAccessHandle(),
      _1954: x0 => x0.close(),
      _1957: x0 => x0.close(),
      _1960: (x0,x1,x2) => x0.open(x1,x2),
      _1966: x0 => x0.start(),
      _1967: x0 => x0.terminate(),
      _1968: (x0,x1) => new SharedWorker(x0,x1),
      _1969: () => new MessageChannel(),
      _1974: x0 => new SharedArrayBuffer(x0),
      _1975: x0 => ({at: x0}),
      _1976: x0 => x0.getSize(),
      _1977: (x0,x1) => x0.truncate(x1),
      _1978: x0 => x0.flush(),
      _1981: x0 => x0.synchronizationBuffer,
      _1982: x0 => x0.communicationBuffer,
      _1983: (x0,x1,x2,x3) => ({clientVersion: x0,root: x1,synchronizationBuffer: x2,communicationBuffer: x3}),
      _1984: (x0,x1) => globalThis.IDBKeyRange.bound(x0,x1),
      _1985: x0 => ({autoIncrement: x0}),
      _1986: (x0,x1,x2) => x0.createObjectStore(x1,x2),
      _1987: x0 => ({unique: x0}),
      _1988: (x0,x1,x2,x3) => x0.createIndex(x1,x2,x3),
      _1989: (x0,x1) => x0.createObjectStore(x1),
      _1990: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1990(f,arguments.length,x0) }),
      _1991: (x0,x1,x2) => x0.transaction(x1,x2),
      _1992: (x0,x1) => x0.objectStore(x1),
      _1994: (x0,x1) => x0.index(x1),
      _1995: x0 => x0.openKeyCursor(),
      _1996: (x0,x1) => x0.getKey(x1),
      _1997: (x0,x1) => ({name: x0,length: x1}),
      _1998: (x0,x1) => x0.put(x1),
      _1999: (x0,x1) => x0.get(x1),
      _2000: (x0,x1) => x0.openCursor(x1),
      _2001: x0 => globalThis.IDBKeyRange.only(x0),
      _2002: (x0,x1,x2) => x0.put(x1,x2),
      _2003: (x0,x1) => x0.update(x1),
      _2004: (x0,x1) => x0.delete(x1),
      _2005: x0 => x0.name,
      _2006: x0 => x0.length,
      _2009: x0 => x0.continue(),
      _2010: () => globalThis.indexedDB,
      _2011: () => globalThis.navigator,
      _2012: (x0,x1) => x0.read(x1),
      _2013: (x0,x1,x2) => x0.read(x1,x2),
      _2014: (x0,x1) => x0.write(x1),
      _2015: (x0,x1,x2) => x0.write(x1,x2),
      _2016: x0 => ({create: x0}),
      _2017: (x0,x1,x2) => x0.getDirectoryHandle(x1,x2),
      _2019: (x0,x1,x2) => globalThis.Atomics.wait(x0,x1,x2),
      _2021: (x0,x1,x2) => globalThis.Atomics.notify(x0,x1,x2),
      _2022: (x0,x1,x2) => globalThis.Atomics.store(x0,x1,x2),
      _2023: (x0,x1) => globalThis.Atomics.load(x0,x1),
      _2024: () => globalThis.Int32Array,
      _2026: () => globalThis.Uint8Array,
      _2028: () => globalThis.DataView,
      _2030: x0 => x0.byteLength,
      _2032: x0 => globalThis.BigInt(x0),
      _2033: x0 => globalThis.Number(x0),
      _2040: x0 => new BroadcastChannel(x0),
      _2041: x0 => globalThis.Array.isArray(x0),
      _2042: (x0,x1) => x0.postMessage(x1),
      _2043: x0 => x0.close(),
      _2044: (x0,x1) => ({kind: x0,table: x1}),
      _2045: x0 => x0.kind,
      _2046: x0 => x0.table,
      _2047: x0 => new JASSUB(x0),
      _2048: x0 => x0.destroy(),
      _2049: x0 => x0.dispose(),
      _2050: (x0,x1) => x0.querySelectorAll(x1),
      _2051: (x0,x1) => x0.item(x1),
      _2052: (x0,x1) => x0.warn(x1),
      _2053: () => new XMLHttpRequest(),
      _2054: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _2056: (x0,x1,x2) => x0.setRequestHeader(x1,x2),
      _2057: (x0,x1) => x0.send(x1),
      _2058: x0 => x0.send(),
      _2060: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._2060(f,arguments.length,x0) }),
      _2061: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._2061(f,arguments.length,x0) }),
      _2066: (x0,x1) => new WebSocket(x0,x1),
      _2067: (x0,x1) => x0.send(x1),
      _2068: (x0,x1,x2) => x0.close(x1,x2),
      _2070: x0 => x0.close(),
      _2071: (x0,x1) => x0.item(x1),
      _2073: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._2073(f,arguments.length,x0) }),
      _2074: (x0,x1,x2) => x0.sendBeacon(x1,x2),
      _2075: (x0,x1,x2) => x0.open(x1,x2),
      _2076: x0 => x0.abort(),
      _2077: x0 => x0.getAllResponseHeaders(),
      _2078: () => new RTCPeerConnection(),
      _2079: (x0,x1) => x0.createDataChannel(x1),
      _2080: x0 => x0.setLocalDescription(),
      _2081: x0 => x0.close(),
      _2082: () => new AbortController(),
      _2083: x0 => x0.abort(),
      _2084: (x0,x1,x2,x3,x4,x5) => ({method: x0,headers: x1,body: x2,credentials: x3,redirect: x4,signal: x5}),
      _2085: (x0,x1) => globalThis.fetch(x0,x1),
      _2086: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._2086(f,arguments.length,x0,x1,x2) }),
      _2087: (x0,x1) => x0.forEach(x1),
      _2088: x0 => x0.getReader(),
      _2089: x0 => x0.cancel(),
      _2090: x0 => x0.read(),
      _2091: (x0,x1) => x0.canPlayType(x1),
      _2092: x0 => globalThis.MediaSource.isTypeSupported(x0),
      _2093: () => new AudioContext(),
      _2094: x0 => x0.close(),
      _2095: (x0,x1) => x0.append(x1),
      _2096: x0 => ({xhrSetup: x0}),
      _2097: x0 => new Hls(x0),
      _2098: () => globalThis.Hls.isSupported(),
      _2100: (x0,x1) => x0.loadSource(x1),
      _2101: (x0,x1) => x0.attachMedia(x1),
      _2114: () => globalThis.window.flutter_inappwebview,
      _2118: (x0,x1) => { x0.nativeCommunication = x1 },
      _2121: (x0,x1) => x0.fetch(x1),
      _2122: o => o instanceof Array,
      _2123: (a, i) => a.splice(i, 1)[0],
      _2125: (a, l) => a.length = l,
      _2126: a => a.pop(),
      _2127: (a, i) => a.splice(i, 1),
      _2128: (a, s) => a.join(s),
      _2129: (a, s, e) => a.slice(s, e),
      _2131: (a, b) => a == b ? 0 : (a > b ? 1 : -1),
      _2132: a => a.length,
      _2133: (a, l) => a.length = l,
      _2134: (a, i) => a[i],
      _2135: (a, i, v) => a[i] = v,
      _2137: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof ArrayBuffer) return 1;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 2;
        }
        return 3;
      },
      _2138: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      _2139: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof DataView) return 1;
        return 2;
      },
      _2140: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint8Array) return 1;
        return 2;
      },
      _2141: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      _2142: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int8Array) return 1;
        return 2;
      },
      _2143: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      _2144: o => o instanceof Uint8ClampedArray,
      _2145: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      _2146: o => o instanceof Uint16Array,
      _2147: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      _2148: o => o instanceof Int16Array,
      _2149: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      _2150: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint32Array) return 1;
        return 2;
      },
      _2151: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      _2152: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int32Array) return 1;
        return 2;
      },
      _2153: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      _2155: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      _2156: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float32Array) return 1;
        return 2;
      },
      _2157: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      _2158: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float64Array) return 1;
        return 2;
      },
      _2159: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      _2160: (a, i) => a.push(i),
      _2161: (t, s) => t.set(s),
      _2162: l => new DataView(new ArrayBuffer(l)),
      _2163: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      _2164: o => o.byteLength,
      _2165: o => o.buffer,
      _2166: o => o.byteOffset,
      _2167: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      _2168: (b, o) => new DataView(b, o),
      _2169: (b, o, l) => new DataView(b, o, l),
      _2170: Function.prototype.call.bind(DataView.prototype.getUint8),
      _2171: Function.prototype.call.bind(DataView.prototype.setUint8),
      _2172: Function.prototype.call.bind(DataView.prototype.getInt8),
      _2173: Function.prototype.call.bind(DataView.prototype.setInt8),
      _2174: Function.prototype.call.bind(DataView.prototype.getUint16),
      _2175: Function.prototype.call.bind(DataView.prototype.setUint16),
      _2176: Function.prototype.call.bind(DataView.prototype.getInt16),
      _2177: Function.prototype.call.bind(DataView.prototype.setInt16),
      _2178: Function.prototype.call.bind(DataView.prototype.getUint32),
      _2179: Function.prototype.call.bind(DataView.prototype.setUint32),
      _2180: Function.prototype.call.bind(DataView.prototype.getInt32),
      _2181: Function.prototype.call.bind(DataView.prototype.setInt32),
      _2184: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      _2185: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      _2186: Function.prototype.call.bind(DataView.prototype.getFloat32),
      _2187: Function.prototype.call.bind(DataView.prototype.setFloat32),
      _2188: Function.prototype.call.bind(DataView.prototype.getFloat64),
      _2189: Function.prototype.call.bind(DataView.prototype.setFloat64),
      _2190: Function.prototype.call.bind(Number.prototype.toString),
      _2191: Function.prototype.call.bind(BigInt.prototype.toString),
      _2192: Function.prototype.call.bind(Number.prototype.toString),
      _2193: (d, digits) => d.toFixed(digits),
      _2204: () => globalThis.document,
      _2205: () => globalThis.window,
      _2206: () => globalThis.console,
      _2211: (x0,x1) => { x0.height = x1 },
      _2213: (x0,x1) => { x0.width = x1 },
      _2215: (x0,x1) => { x0.pointerEvents = x1 },
      _2218: x0 => x0.head,
      _2219: x0 => x0.classList,
      _2223: (x0,x1) => { x0.innerText = x1 },
      _2224: x0 => x0.style,
      _2226: x0 => x0.sheet,
      _2227: x0 => x0.src,
      _2228: (x0,x1) => { x0.src = x1 },
      _2229: x0 => x0.naturalWidth,
      _2230: x0 => x0.naturalHeight,
      _2237: x0 => x0.offsetX,
      _2238: x0 => x0.offsetY,
      _2239: x0 => x0.button,
      _2245: (x0,x1) => x0.error(x1),
      _2250: x0 => x0.status,
      _2251: (x0,x1) => { x0.responseType = x1 },
      _2253: x0 => x0.response,
      _2290: x0 => x0.readyState,
      _2292: (x0,x1) => { x0.timeout = x1 },
      _2294: (x0,x1) => { x0.withCredentials = x1 },
      _2295: x0 => x0.upload,
      _2296: x0 => x0.responseURL,
      _2297: x0 => x0.status,
      _2298: x0 => x0.statusText,
      _2300: (x0,x1) => { x0.responseType = x1 },
      _2301: x0 => x0.response,
      _2302: x0 => x0.responseText,
      _2313: x0 => x0.loaded,
      _2314: x0 => x0.total,
      _2361: (x0,x1) => { x0.draggable = x1 },
      _2377: x0 => x0.style,
      _2630: x0 => x0.content,
      _2734: (x0,x1) => { x0.target = x1 },
      _2736: (x0,x1) => { x0.download = x1 },
      _2740: (x0,x1) => { x0.rel = x1 },
      _2761: (x0,x1) => { x0.href = x1 },
      _2853: x0 => x0.src,
      _2854: (x0,x1) => { x0.src = x1 },
      _2857: x0 => x0.name,
      _2858: (x0,x1) => { x0.name = x1 },
      _2859: x0 => x0.sandbox,
      _2860: x0 => x0.allow,
      _2861: (x0,x1) => { x0.allow = x1 },
      _2862: x0 => x0.allowFullscreen,
      _2863: (x0,x1) => { x0.allowFullscreen = x1 },
      _2868: x0 => x0.referrerPolicy,
      _2869: (x0,x1) => { x0.referrerPolicy = x1 },
      _2873: x0 => x0.contentWindow,
      _2949: x0 => x0.videoWidth,
      _2950: x0 => x0.videoHeight,
      _2962: (x0,x1) => { x0.kind = x1 },
      _2964: (x0,x1) => { x0.src = x1 },
      _2966: (x0,x1) => { x0.srclang = x1 },
      _2968: (x0,x1) => { x0.label = x1 },
      _2972: x0 => x0.track,
      _2979: x0 => x0.error,
      _2981: (x0,x1) => { x0.src = x1 },
      _2986: (x0,x1) => { x0.crossOrigin = x1 },
      _2989: (x0,x1) => { x0.preload = x1 },
      _2990: x0 => x0.buffered,
      _2991: x0 => x0.readyState,
      _2993: x0 => x0.currentTime,
      _2994: (x0,x1) => { x0.currentTime = x1 },
      _2995: x0 => x0.duration,
      _2996: x0 => x0.paused,
      _2999: x0 => x0.playbackRate,
      _3000: (x0,x1) => { x0.playbackRate = x1 },
      _3005: x0 => x0.ended,
      _3007: (x0,x1) => { x0.autoplay = x1 },
      _3009: (x0,x1) => { x0.loop = x1 },
      _3011: (x0,x1) => { x0.controls = x1 },
      _3012: x0 => x0.volume,
      _3013: (x0,x1) => { x0.volume = x1 },
      _3014: x0 => x0.muted,
      _3015: (x0,x1) => { x0.muted = x1 },
      _3020: x0 => x0.textTracks,
      _3031: x0 => x0.message,
      _3065: (x0,x1) => x0[x1],
      _3067: x0 => x0.length,
      _3076: x0 => x0.kind,
      _3077: x0 => x0.label,
      _3078: x0 => x0.language,
      _3082: (x0,x1) => { x0.mode = x1 },
      _3084: x0 => x0.activeCues,
      _3088: (x0,x1) => x0[x1],
      _3090: x0 => x0.length,
      _3104: x0 => x0.length,
      _3300: (x0,x1) => { x0.accept = x1 },
      _3314: x0 => x0.files,
      _3340: (x0,x1) => { x0.multiple = x1 },
      _3358: (x0,x1) => { x0.type = x1 },
      _3607: x0 => x0.src,
      _3608: (x0,x1) => { x0.src = x1 },
      _3610: (x0,x1) => { x0.type = x1 },
      _3614: (x0,x1) => { x0.async = x1 },
      _3620: (x0,x1) => { x0.text = x1 },
      _3628: (x0,x1) => { x0.charset = x1 },
      _4077: () => globalThis.window,
      _4116: x0 => x0.document,
      _4119: x0 => x0.location,
      _4138: x0 => x0.navigator,
      _4401: x0 => x0.sessionStorage,
      _4402: x0 => x0.localStorage,
      _4410: x0 => x0.href,
      _4412: x0 => x0.origin,
      _4504: x0 => x0.clipboard,
      _4506: x0 => x0.geolocation,
      _4509: x0 => x0.mediaDevices,
      _4510: x0 => x0.mediaSession,
      _4511: x0 => x0.permissions,
      _4512: x0 => x0.maxTouchPoints,
      _4525: x0 => x0.userAgent,
      _4531: x0 => x0.onLine,
      _4538: x0 => x0.storage,
      _4576: x0 => x0.data,
      _4577: x0 => x0.origin,
      _4606: x0 => x0.port1,
      _4607: x0 => x0.port2,
      _4609: (x0,x1) => { x0.onmessage = x1 },
      _4687: x0 => x0.port,
      _4722: x0 => x0.length,
      _4906: (x0,x1) => { x0.snapToLines = x1 },
      _4908: (x0,x1) => { x0.line = x1 },
      _4909: x0 => x0.lineAlign,
      _4910: (x0,x1) => { x0.lineAlign = x1 },
      _4939: x0 => x0.readyState,
      _4948: x0 => x0.protocol,
      _4952: (x0,x1) => { x0.binaryType = x1 },
      _4955: x0 => x0.code,
      _4956: x0 => x0.reason,
      _5013: x0 => x0.localDescription,
      _5020: x0 => x0.iceGatheringState,
      _5048: x0 => x0.sdp,
      _6107: x0 => x0.destination,
      _6262: x0 => x0.maxChannelCount,
      _6662: x0 => x0.signal,
      _6671: x0 => x0.length,
      _6673: x0 => x0.length,
      _6716: x0 => x0.baseURI,
      _6722: x0 => x0.firstChild,
      _6729: (x0,x1) => { x0.textContent = x1 },
      _6733: () => globalThis.document,
      _6791: x0 => x0.documentElement,
      _6812: x0 => x0.body,
      _6814: x0 => x0.head,
      _6854: x0 => x0.fullscreenElement,
      _7143: x0 => x0.id,
      _7144: (x0,x1) => { x0.id = x1 },
      _7161: x0 => x0.clientWidth,
      _7162: x0 => x0.clientHeight,
      _7168: (x0,x1) => { x0.innerHTML = x1 },
      _7171: x0 => x0.children,
      _7374: x0 => x0.length,
      _8489: x0 => x0.value,
      _8491: x0 => x0.done,
      _8654: x0 => x0.size,
      _8655: x0 => x0.type,
      _8662: x0 => x0.name,
      _8668: x0 => x0.length,
      _8673: x0 => x0.result,
      _9168: x0 => x0.url,
      _9170: x0 => x0.status,
      _9171: x0 => x0.ok,
      _9172: x0 => x0.statusText,
      _9173: x0 => x0.headers,
      _9174: x0 => x0.body,
      _9302: (x0,x1) => { x0.lang = x1 },
      _9304: (x0,x1) => { x0.continuous = x1 },
      _9306: (x0,x1) => { x0.interimResults = x1 },
      _9314: (x0,x1) => { x0.onspeechstart = x1 },
      _9322: (x0,x1) => { x0.onresult = x1 },
      _9324: (x0,x1) => { x0.onnomatch = x1 },
      _9326: (x0,x1) => { x0.onerror = x1 },
      _9328: (x0,x1) => { x0.onstart = x1 },
      _9330: (x0,x1) => { x0.onend = x1 },
      _9331: x0 => x0.error,
      _9333: x0 => x0.transcript,
      _9334: x0 => x0.confidence,
      _9335: x0 => x0.length,
      _9337: x0 => x0.length,
      _9339: x0 => x0.results,
      _10616: x0 => x0.result,
      _10617: x0 => x0.error,
      _10628: (x0,x1) => { x0.onupgradeneeded = x1 },
      _10630: x0 => x0.oldVersion,
      _10709: x0 => x0.key,
      _10710: x0 => x0.primaryKey,
      _10712: x0 => x0.value,
      _10903: x0 => x0.id,
      _10904: x0 => x0.index,
      _10908: x0 => x0.axes,
      _10909: x0 => x0.buttons,
      _10912: x0 => x0.value,
      _10930: x0 => x0.gamepad,
      _11226: (x0,x1) => { x0.backgroundColor = x1 },
      _11272: (x0,x1) => { x0.border = x1 },
      _11550: (x0,x1) => { x0.display = x1 },
      _11714: (x0,x1) => { x0.height = x1 },
      _11770: (x0,x1) => { x0.left = x1 },
      _11908: (x0,x1) => { x0.objectFit = x1 },
      _11942: (x0,x1) => { x0.overflow = x1 },
      _12038: (x0,x1) => { x0.pointerEvents = x1 },
      _12040: (x0,x1) => { x0.position = x1 },
      _12332: (x0,x1) => { x0.top = x1 },
      _12336: (x0,x1) => { x0.transform = x1 },
      _12340: (x0,x1) => { x0.transformOrigin = x1 },
      _12404: (x0,x1) => { x0.width = x1 },
      _12772: x0 => x0.name,
      _12773: x0 => x0.message,
      _13475: () => globalThis.console,

    };

    const baseImports = {
      dart2wasm: dart2wasm,
      Math: Math,
      Date: Date,
      Object: Object,
      Array: Array,
      Reflect: Reflect,
      WebAssembly: {
        JSTag: WebAssembly.JSTag,
      },
      "": new Proxy({}, { get(_, prop) { return prop; } }),

    };

    const jsStringPolyfill = {
      "charCodeAt": (s, i) => s.charCodeAt(i),
      "compare": (s1, s2) => {
        if (s1 < s2) return -1;
        if (s1 > s2) return 1;
        return 0;
      },
      "concat": (s1, s2) => s1 + s2,
      "equals": (s1, s2) => s1 === s2,
      "fromCharCode": (i) => String.fromCharCode(i),
      "length": (s) => s.length,
      "substring": (s, a, b) => s.substring(a, b),
      "fromCharCodeArray": (a, start, end) => {
        if (end <= start) return '';

        const read = dartInstance.exports.$wasmI16ArrayGet;
        let result = '';
        let index = start;
        const chunkLength = Math.min(end - index, 500);
        let array = new Array(chunkLength);
        while (index < end) {
          const newChunkLength = Math.min(end - index, 500);
          for (let i = 0; i < newChunkLength; i++) {
            array[i] = read(a, index++);
          }
          if (newChunkLength < chunkLength) {
            array = array.slice(0, newChunkLength);
          }
          result += String.fromCharCode(...array);
        }
        return result;
      },
      "intoCharCodeArray": (s, a, start) => {
        if (s === '') return 0;

        const write = dartInstance.exports.$wasmI16ArraySet;
        for (var i = 0; i < s.length; ++i) {
          write(a, start++, s.charCodeAt(i));
        }
        return s.length;
      },
      "test": (s) => typeof s == "string",
    };


    

    dartInstance = await WebAssembly.instantiate(this.module, {
      ...baseImports,
      ...additionalImports,
      
      "wasm:js-string": jsStringPolyfill,
    });
    dartInstance.exports.$setThisModule(dartInstance);

    return new InstantiatedApp(this, dartInstance);
  }
}

class InstantiatedApp {
  constructor(compiledApp, instantiatedModule) {
    this.compiledApp = compiledApp;
    this.instantiatedModule = instantiatedModule;
  }

  // Call the main function with the given arguments.
  invokeMain(...args) {
    this.instantiatedModule.exports.$invokeMain(args);
  }
}
