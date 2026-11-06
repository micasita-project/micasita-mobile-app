const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const marker = '// MiCasita: scene lifecycle for iOS 27.';
const sceneDelegate = `

${marker}
@objc(MiCasitaSceneDelegate)
final class MiCasitaSceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene, let appDelegate else { return }
    appDelegate.connectScene(windowScene, options: connectionOptions)
    window = appDelegate.window
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [
        .openInPlace: context.options.openInPlace
      ]
      if let source = context.options.sourceApplication {
        options[.sourceApplication] = source
      }
      if let annotation = context.options.annotation {
        options[.annotation] = annotation
      }
      _ = appDelegate?.application(UIApplication.shared, open: context.url, options: options)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = appDelegate?.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }
}
`;

const connection = `
  private var sceneLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?

  func connectScene(_ windowScene: UIWindowScene, options: UIScene.ConnectionOptions) {
    if let window {
      window.windowScene = windowScene
      window.makeKeyAndVisible()
      return
    }
    var launchOptions = sceneLaunchOptions ?? [:]
    if let context = options.urlContexts.first {
      launchOptions[.url] = context.url
      launchOptions[.sourceApplication] = context.options.sourceApplication
    } else if let activity = options.userActivities.first(where: {
      $0.activityType == NSUserActivityTypeBrowsingWeb
    }), let url = activity.webpageURL {
      launchOptions[.url] = url
    }
    let sceneWindow = UIWindow(windowScene: windowScene)
    window = sceneWindow
    reactNativeFactory?.startReactNative(
      withModuleName: "main",
      in: sceneWindow,
      launchOptions: launchOptions
    )
    sceneWindow.makeKeyAndVisible()
  }
`;

function adaptAppDelegate(source) {
  if (source.includes(marker)) return source;
  const windowBlock = /#if os\(iOS\) \|\| os\(tvOS\)\s+window = UIWindow\(frame: UIScreen\.main\.bounds\)\s+factory\.startReactNative\(\s+withModuleName: "main",\s+in: window,\s+launchOptions: launchOptions\)\s+#endif/;
  if (!windowBlock.test(source) || !source.includes('  // Linking API')) {
    throw new Error('MiCasita: revisar el plugin de escenas tras cambiar la plantilla de AppDelegate.');
  }
  return source
    .replace(windowBlock, 'sceneLaunchOptions = launchOptions')
    .replace('  // Linking API', connection + '\n  // Linking API') + sceneDelegate;
}

function configureInfoPlist(info) {
  info.UIApplicationSceneManifest = {
    UIApplicationSupportsMultipleScenes: false,
    UISceneConfigurations: {
      UIWindowSceneSessionRoleApplication: [{
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: 'MiCasitaSceneDelegate',
      }],
    },
  };
  info.NSLocalNetworkUsageDescription = 'Permite conectarse al servidor de desarrollo en tu Mac.';
  return info;
}

module.exports = function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, mod => {
    mod.modResults = configureInfoPlist(mod.modResults);
    return mod;
  });
  return withAppDelegate(config, mod => {
    if (mod.modResults.language !== 'swift') {
      throw new Error('MiCasita: el soporte de escenas requiere el AppDelegate de Swift.');
    }
    mod.modResults.contents = adaptAppDelegate(mod.modResults.contents);
    return mod;
  });
};

module.exports.adaptAppDelegate = adaptAppDelegate;
module.exports.configureInfoPlist = configureInfoPlist;
