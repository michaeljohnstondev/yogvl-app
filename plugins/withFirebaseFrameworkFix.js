// @react-native-firebase v22+ wraps native modules in framework modules.
// With use_frameworks! :linkage => :static, those modules include React-Core
// headers that aren't part of a clang module, which breaks the iOS build with
// non-modular include errors and missing RCT type declarations.
//
// Two changes are needed:
//   1. $RNFirebaseAsStaticFramework = true  (global flag at top of Podfile)
//      Tells @react-native-firebase to wrap itself as a static framework
//      so its headers don't reach for non-modular React-Core symbols.
//   2. CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES (post_install)
//      Safety net that relaxes any remaining strict-include checks to warnings.

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TAG_START = '# BEGIN withFirebaseFrameworkFix';
const TAG_END = '# END withFirebaseFrameworkFix';

const STATIC_FRAMEWORK_FLAG = `${TAG_START}\n$RNFirebaseAsStaticFramework = true\n${TAG_END}\n\n`;

const POST_INSTALL_FIX = `
    ${TAG_START}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
    ${TAG_END}`;

// React Native pods that need to be declared as modular so that
// @react-native-firebase's framework modules can import their headers
// across the framework boundary.
const MODULAR_PODS_BLOCK = `  ${TAG_START}
  pod 'React-Core', :modular_headers => true
  pod 'React-CoreModules', :modular_headers => true
  pod 'React-RCTAppDelegate', :modular_headers => true
  pod 'React-cxxreact', :modular_headers => true
  pod 'React-jsi', :modular_headers => true
  pod 'React-jsiexecutor', :modular_headers => true
  pod 'ReactCommon/turbomodule/core', :modular_headers => true
  pod 'RCT-Folly', :modular_headers => true
  pod 'RCTRequired', :modular_headers => true
  pod 'RCTTypeSafety', :modular_headers => true
  pod 'glog', :modular_headers => true
  pod 'DoubleConversion', :modular_headers => true
  ${TAG_END}
`;

function injectFix(podfile) {
  if (podfile.includes(TAG_START)) {
    return podfile;
  }

  // 1. Prepend the static framework flag at the top of the Podfile.
  let updated = STATIC_FRAMEWORK_FLAG + podfile;

  // 2. Add modular_headers pod declarations inside the target block,
  //    just before use_react_native! is called.
  const useReactNativeMatch = updated.match(/^( *)use_react_native!\(/m);
  if (useReactNativeMatch) {
    const insertAt = useReactNativeMatch.index;
    updated = updated.slice(0, insertAt) + MODULAR_PODS_BLOCK + '\n' + updated.slice(insertAt);
  }

  // 3. Add the post_install build setting fix as a safety net.
  const postInstallMatch = updated.match(/post_install do \|installer\|\n/);
  if (postInstallMatch) {
    const insertAt = postInstallMatch.index + postInstallMatch[0].length;
    updated =
      updated.slice(0, insertAt) + POST_INSTALL_FIX + '\n' + updated.slice(insertAt);
  } else {
    updated += `\n\npost_install do |installer|${POST_INSTALL_FIX}\nend\n`;
  }

  return updated;
}

module.exports = function withFirebaseFrameworkFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (innerConfig) => {
      const podfilePath = path.join(
        innerConfig.modRequest.platformProjectRoot,
        'Podfile'
      );
      const original = fs.readFileSync(podfilePath, 'utf-8');
      fs.writeFileSync(podfilePath, injectFix(original));
      return innerConfig;
    },
  ]);
};
