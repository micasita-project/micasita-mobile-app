const { withAppDelegate } = require('expo/config-plugins');

const marker = '// MiCasita: keep the debug menu available without the shake gesture.';

function disableShakeGesture(source) {
  if (source.includes(marker)) return source;
  const anchor = '    let delegate = ReactNativeDelegate()';
  if (!source.includes(anchor)) {
    throw new Error('MiCasita: revisar la configuración del menú de desarrollo tras cambiar AppDelegate.');
  }
  return source.replace(anchor, `    ${marker}
    #if DEBUG
    var devSettings = UserDefaults.standard.dictionary(forKey: "RCTDevMenu") ?? [:]
    devSettings["shakeToShow"] = false
    UserDefaults.standard.set(devSettings, forKey: "RCTDevMenu")
    #endif

${anchor}`);
}

module.exports = function withIosDevMenu(config) {
  return withAppDelegate(config, mod => {
    if (mod.modResults.language !== 'swift') {
      throw new Error('MiCasita: la configuración del menú requiere AppDelegate de Swift.');
    }
    mod.modResults.contents = disableShakeGesture(mod.modResults.contents);
    return mod;
  });
};

module.exports.disableShakeGesture = disableShakeGesture;
